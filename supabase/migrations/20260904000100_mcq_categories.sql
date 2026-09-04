-- ============================================================================
-- Testify - Migration 4: MCQ category discovery + difficulty fallback
-- Fixes: candidates could pick categories with zero questions (RLS hides
-- mcq_questions from them, so the UI had no way to know) -> 400 NO_QUESTIONS.
-- ============================================================================

-- Categories that actually have questions, with counts. SECURITY DEFINER so
-- candidates can populate the picker without ever reading answer keys.
create or replace function public.get_mcq_categories()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('category', category, 'count', cnt) order by category),
    '[]'::jsonb
  )
  from (
    select category, count(*)::int as cnt
    from public.mcq_questions
    group by category
  ) c;
$$;

revoke execute on function public.get_mcq_categories() from public, anon;
grant execute on function public.get_mcq_categories() to authenticated, service_role;

-- start_mcq_attempt: add a final fallback that drops the difficulty filter
-- when it would otherwise produce zero questions (a sparse bank should give
-- a mixed-difficulty quiz, not an error).
create or replace function public.start_mcq_attempt(
  p_category text default null,
  p_difficulty text default null,
  p_count int default 10,
  p_interview_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_category text := nullif(trim(coalesce(p_category, '')), '');
  v_difficulty text := nullif(trim(coalesce(p_difficulty, '')), '');
  v_count int := coalesce(p_count, 10);
  v_interview public.interviews%rowtype;
  v_ids uuid[];
  v_attempt_id uuid;
  v_questions jsonb;
begin
  if v_uid is null then
    raise exception 'UNAUTHORIZED: you must be signed in to start an MCQ attempt';
  end if;

  if p_interview_id is not null then
    select * into v_interview from public.interviews where id = p_interview_id;
    if not found then
      raise exception 'INTERVIEW_NOT_FOUND: interview does not exist';
    end if;
    if v_interview.candidate_id is distinct from v_uid then
      raise exception 'FORBIDDEN: you are not the candidate of this interview';
    end if;

    v_category := nullif(trim(coalesce(v_interview.settings ->> 'mcq_category', '')), '');
    v_count := coalesce(
      case when v_interview.settings ->> 'mcq_question_count' ~ '^[0-9]{1,3}$'
           then (v_interview.settings ->> 'mcq_question_count')::int
      end,
      v_count);
    v_difficulty := v_interview.difficulty;

    update public.interviews
       set status = 'active',
           started_at = coalesce(started_at, now())
     where id = p_interview_id;
  end if;

  v_count := greatest(1, least(v_count, 50));

  select array_agg(id) into v_ids
  from (
    select id
    from public.mcq_questions q
    where (v_category is null or q.category = v_category)
      and (v_difficulty is null or q.difficulty = v_difficulty)
    order by random()
    limit v_count
  ) picked;

  -- 'expert' falls back to 'hard' when no expert questions exist
  if coalesce(array_length(v_ids, 1), 0) = 0 and v_difficulty = 'expert' then
    select array_agg(id) into v_ids
    from (
      select id
      from public.mcq_questions q
      where (v_category is null or q.category = v_category)
        and q.difficulty = 'hard'
      order by random()
      limit v_count
    ) picked;
    if coalesce(array_length(v_ids, 1), 0) > 0 then
      v_difficulty := 'hard';
    end if;
  end if;

  -- Final fallback: drop the difficulty filter entirely rather than failing.
  if coalesce(array_length(v_ids, 1), 0) = 0 and v_difficulty is not null then
    select array_agg(id) into v_ids
    from (
      select id
      from public.mcq_questions q
      where (v_category is null or q.category = v_category)
      order by random()
      limit v_count
    ) picked;
    if coalesce(array_length(v_ids, 1), 0) > 0 then
      v_difficulty := null;
    end if;
  end if;

  if coalesce(array_length(v_ids, 1), 0) = 0 then
    raise exception 'NO_QUESTIONS: no MCQ questions match the requested category/difficulty';
  end if;

  insert into public.mcq_attempts (interview_id, candidate_id, category, difficulty, question_ids, total_questions)
  values (p_interview_id, v_uid, v_category, v_difficulty, v_ids, array_length(v_ids, 1))
  returning id into v_attempt_id;

  select jsonb_agg(
           jsonb_build_object(
             'id', q.id,
             'category', q.category,
             'question', q.question,
             'option_a', q.option_a,
             'option_b', q.option_b,
             'option_c', q.option_c,
             'option_d', q.option_d,
             'difficulty', q.difficulty
           )
           order by array_position(v_ids, q.id)
         )
    into v_questions
  from public.mcq_questions q
  where q.id = any (v_ids);

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'time_limit_seconds', array_length(v_ids, 1) * 60,
    'questions', coalesce(v_questions, '[]'::jsonb)
  );
end;
$$;
