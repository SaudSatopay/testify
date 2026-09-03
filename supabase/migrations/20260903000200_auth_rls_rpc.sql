-- ============================================================================
-- Testify - Migration 2: helper functions, auth trigger, RLS policies, RPCs
-- ============================================================================
-- All SECURITY DEFINER functions pin search_path = public.
-- Helper functions are SECURITY DEFINER so RLS policies can consult
-- profiles/interviews WITHOUT recursive policy evaluation.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Role / access helper functions
-- ----------------------------------------------------------------------------
create or replace function public.get_user_role(p_user_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = p_user_id;
$$;

create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and role = 'admin'
  );
$$;

create or replace function public.is_interviewer_or_admin(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and role in ('interviewer', 'admin')
  );
$$;

create or replace function public.is_interview_creator(p_interview_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.interviews
    where id = p_interview_id and created_by = p_user_id
  );
$$;

-- creator OR candidate of the interview
create or replace function public.is_interview_participant(p_interview_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.interviews
    where id = p_interview_id
      and (created_by = p_user_id or candidate_id = p_user_id)
  );
$$;

-- Helper functions are used inside policies, so every API role must be able
-- to execute them.
grant execute on function public.get_user_role(uuid) to anon, authenticated, service_role;
grant execute on function public.is_admin(uuid) to anon, authenticated, service_role;
grant execute on function public.is_interviewer_or_admin(uuid) to anon, authenticated, service_role;
grant execute on function public.is_interview_creator(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.is_interview_participant(uuid, uuid) to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Auth trigger: create a profile for each new auth user.
-- Role from signup metadata may ONLY be 'candidate' or 'interviewer';
-- anything else (including 'admin') is coerced to 'candidate'.
-- Admin role must only ever be granted via SQL / service role.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data ->> 'role', 'candidate');
  if v_role not in ('candidate', 'interviewer') then
    v_role := 'candidate';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Privilege-escalation guard: only admins (or the service role, where
-- auth.uid() is NULL) may change profiles.role or profiles.status.
-- ----------------------------------------------------------------------------
create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and auth.uid() is not null
     and not public.is_admin(auth.uid()) then
    raise exception 'FORBIDDEN: only admins may change role or status';
  end if;
  return new;
end;
$$;

create trigger trg_profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_privilege_escalation();

-- ----------------------------------------------------------------------------
-- RPC: log_audit - append an audit log row as the calling user.
-- ----------------------------------------------------------------------------
create or replace function public.log_audit(
  p_action text,
  p_resource_type text default null,
  p_resource_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  values (auth.uid(), p_action, p_resource_type, p_resource_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

-- ----------------------------------------------------------------------------
-- RPC: accept_invitation - candidate accepts an interview invitation token.
-- Returns the interview id.
-- ----------------------------------------------------------------------------
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.interview_invitations%rowtype;
  v_email text;
  v_role text;
begin
  if v_uid is null then
    raise exception 'UNAUTHORIZED: you must be signed in to accept an invitation';
  end if;

  select * into v_inv
  from public.interview_invitations
  where token = p_token
  for update;

  if not found then
    raise exception 'INVITATION_NOT_FOUND: no invitation matches this token';
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'INVITATION_NOT_PENDING: this invitation is % and can no longer be accepted', v_inv.status;
  end if;

  if v_inv.expires_at < now() then
    -- Mark expired for clarity. Note: the subsequent RAISE aborts the
    -- transaction, so the persisted status stays 'pending'; the expires_at
    -- check above remains the authoritative guard on every attempt.
    update public.interview_invitations set status = 'expired' where id = v_inv.id;
    raise exception 'INVITATION_EXPIRED: this invitation expired at %', v_inv.expires_at;
  end if;

  select lower(coalesce(email, '')) into v_email from auth.users where id = v_uid;

  if not (
    lower(v_inv.candidate_email) = v_email
    or v_inv.candidate_id is null
    or v_inv.candidate_id = v_uid
  ) then
    raise exception 'INVITATION_EMAIL_MISMATCH: this invitation was issued to a different account';
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role is distinct from 'candidate' then
    raise exception 'ROLE_NOT_CANDIDATE: only candidate accounts can accept interview invitations';
  end if;

  update public.interview_invitations
     set candidate_id = v_uid,
         status = 'accepted'
   where id = v_inv.id;

  update public.interviews
     set candidate_id = v_uid,
         status = case when status = 'draft' then 'scheduled' else status end
   where id = v_inv.interview_id;

  insert into public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  values (v_uid, 'invitation_accepted', 'interview_invitation', v_inv.id,
          jsonb_build_object('interview_id', v_inv.interview_id));

  return v_inv.interview_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- RPC: start_mcq_attempt - creates an attempt and returns the questions
-- WITHOUT correct_option/explanation (candidates never see answers pre-submit).
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- RPC: submit_mcq_attempt - scores server-side against attempt.question_ids.
-- p_answers: [{ "question_id": uuid, "selected_option": "a"|"b"|"c"|"d"|null,
--               "marked_for_review": bool }]
-- ----------------------------------------------------------------------------
create or replace function public.submit_mcq_attempt(p_attempt_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.mcq_attempts%rowtype;
  v_total int;
  v_correct int := 0;
  v_answered int := 0;
  v_score numeric;
  v_time int;
  v_results jsonb;
  r record;
  v_sel text;
  v_marked boolean;
begin
  if v_uid is null then
    raise exception 'UNAUTHORIZED: you must be signed in to submit an MCQ attempt';
  end if;

  select * into v_attempt
  from public.mcq_attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception 'ATTEMPT_NOT_FOUND: attempt does not exist';
  end if;
  if v_attempt.candidate_id <> v_uid then
    raise exception 'FORBIDDEN: this attempt belongs to another user';
  end if;
  if v_attempt.completed_at is not null then
    raise exception 'ATTEMPT_ALREADY_SUBMITTED: this attempt has already been submitted';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'VALIDATION_ERROR: p_answers must be a JSON array';
  end if;

  v_total := coalesce(array_length(v_attempt.question_ids, 1), 0);

  -- One mcq_answers row per attempt question. Only questions belonging to the
  -- attempt are scored; extra entries in p_answers are ignored.
  for r in
    select q.id as question_id, q.correct_option
    from public.mcq_questions q
    where q.id = any (v_attempt.question_ids)
  loop
    select a ->> 'selected_option',
           (a ->> 'marked_for_review') in ('true', 't', '1')
      into v_sel, v_marked
      from jsonb_array_elements(p_answers) a
     where (a ->> 'question_id') = r.question_id::text
     limit 1;

    v_marked := coalesce(v_marked, false);
    if v_sel is not null and v_sel not in ('a', 'b', 'c', 'd') then
      v_sel := null;
    end if;
    if v_sel is not null then
      v_answered := v_answered + 1;
    end if;
    if v_sel = r.correct_option then
      v_correct := v_correct + 1;
    end if;

    insert into public.mcq_answers (attempt_id, question_id, selected_option, is_correct, marked_for_review)
    values (p_attempt_id, r.question_id, v_sel, coalesce(v_sel = r.correct_option, false), v_marked);
  end loop;

  v_score := case when v_total > 0
                  then round(v_correct::numeric * 100 / v_total, 2)
                  else 0 end;
  v_time := greatest(0, floor(extract(epoch from (now() - v_attempt.started_at))))::int;

  update public.mcq_attempts
     set completed_at = now(),
         correct_answers = v_correct,
         score = v_score,
         time_taken_seconds = v_time
   where id = p_attempt_id;

  if v_attempt.interview_id is not null then
    insert into public.interview_results (interview_id, candidate_id, mcq_score, overall_score)
    values (v_attempt.interview_id, v_uid, v_score, v_score)
    on conflict (interview_id, candidate_id)
    do update set mcq_score = excluded.mcq_score,
                  overall_score = excluded.overall_score;

    update public.interviews
       set status = 'completed',
           ended_at = now()
     where id = v_attempt.interview_id;
  end if;

  select jsonb_agg(
           jsonb_build_object(
             'question_id', q.id,
             'question', q.question,
             'option_a', q.option_a,
             'option_b', q.option_b,
             'option_c', q.option_c,
             'option_d', q.option_d,
             'selected_option', ans.selected_option,
             'correct_option', q.correct_option,
             'is_correct', ans.is_correct,
             'explanation', q.explanation,
             'category', q.category,
             'marked_for_review', ans.marked_for_review
           )
           order by array_position(v_attempt.question_ids, q.id)
         )
    into v_results
  from public.mcq_questions q
  join public.mcq_answers ans
    on ans.question_id = q.id and ans.attempt_id = p_attempt_id
  where q.id = any (v_attempt.question_ids);

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'score', v_score,
    'total_questions', v_total,
    'correct_answers', v_correct,
    'incorrect_answers', v_answered - v_correct,
    'skipped', v_total - v_answered,
    'percentage', v_score,
    'time_taken_seconds', v_time,
    'results', coalesce(v_results, '[]'::jsonb)
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- RPC: get_platform_stats - admin-only dashboard counters.
-- ----------------------------------------------------------------------------
create or replace function public.get_platform_stats()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_stats jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'FORBIDDEN: admin role required';
  end if;

  select jsonb_build_object(
    'total_users',            (select count(*) from public.profiles),
    'candidates',             (select count(*) from public.profiles where role = 'candidate'),
    'interviewers',           (select count(*) from public.profiles where role = 'interviewer'),
    'admins',                 (select count(*) from public.profiles where role = 'admin'),
    'total_interviews',       (select count(*) from public.interviews),
    'completed_interviews',   (select count(*) from public.interviews where status = 'completed'),
    'active_interviews',      (select count(*) from public.interviews where status = 'active'),
    'scheduled_interviews',   (select count(*) from public.interviews where status = 'scheduled'),
    'avg_overall_score',      (select round(avg(overall_score), 2) from public.interview_results where overall_score is not null),
    'total_questions',        (select count(*) from public.questions),
    'total_mcqs',             (select count(*) from public.mcq_questions),
    'total_attempts',         (select count(*) from public.mcq_attempts),
    'users_last_30_days',     (select count(*) from public.profiles where created_at >= now() - interval '30 days'),
    'interviews_last_30_days',(select count(*) from public.interviews where created_at >= now() - interval '30 days')
  ) into v_stats;

  return v_stats;
end;
$$;

-- ----------------------------------------------------------------------------
-- RPC execute grants: authenticated only (never anon).
-- ----------------------------------------------------------------------------
revoke execute on function public.log_audit(text, text, uuid, jsonb) from public, anon;
revoke execute on function public.accept_invitation(text) from public, anon;
revoke execute on function public.start_mcq_attempt(text, text, int, uuid) from public, anon;
revoke execute on function public.submit_mcq_attempt(uuid, jsonb) from public, anon;
revoke execute on function public.get_platform_stats() from public, anon;

grant execute on function public.log_audit(text, text, uuid, jsonb) to authenticated, service_role;
grant execute on function public.accept_invitation(text) to authenticated, service_role;
grant execute on function public.start_mcq_attempt(text, text, int, uuid) to authenticated, service_role;
grant execute on function public.submit_mcq_attempt(uuid, jsonb) to authenticated, service_role;
grant execute on function public.get_platform_stats() to authenticated, service_role;

-- ============================================================================
-- RLS POLICIES
-- (Policies never query public.profiles directly from a profiles policy;
--  helper functions above are SECURITY DEFINER and bypass RLS, so there is
--  no recursive policy evaluation.)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create policy "profiles_select_own_admin_or_interview_counterpart"
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or public.is_admin(auth.uid())
    or exists (
      select 1
      from public.interviews i
      where (i.created_by = auth.uid() and i.candidate_id = profiles.id)
         or (i.candidate_id = auth.uid() and i.created_by = profiles.id)
    )
  );

create policy "profiles_update_own_or_admin"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()))
  with check (id = auth.uid() or public.is_admin(auth.uid()));
-- No INSERT/DELETE policies: rows are created by the auth trigger and removed
-- via auth.users cascade (service role only).

-- ----------------------------------------------------------------------------
-- interviews
-- ----------------------------------------------------------------------------
create policy "interviews_select_participants_or_admin"
  on public.interviews
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or candidate_id = auth.uid()
    or public.is_admin(auth.uid())
  );

create policy "interviews_insert_staff_or_candidate_self_practice"
  on public.interviews
  for insert
  to authenticated
  with check (
    (created_by = auth.uid() and public.is_interviewer_or_admin(auth.uid()))
    or (
      created_by = auth.uid()
      and candidate_id = auth.uid()
      and type in ('ai_mock', 'mcq')
    )
  );

create policy "interviews_update_participants_or_admin"
  on public.interviews
  for update
  to authenticated
  using (
    created_by = auth.uid()
    or candidate_id = auth.uid()
    or public.is_admin(auth.uid())
  )
  with check (
    created_by = auth.uid()
    or candidate_id = auth.uid()
    or public.is_admin(auth.uid())
  );

create policy "interviews_delete_creator_or_admin"
  on public.interviews
  for delete
  to authenticated
  using (created_by = auth.uid() or public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- questions
-- ----------------------------------------------------------------------------
create policy "questions_select_own_seed_admin_or_assigned"
  on public.questions
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or created_by is null
    or public.is_admin(auth.uid())
    or exists (
      select 1
      from public.interview_questions iq
      where iq.question_id = questions.id
        and public.is_interview_participant(iq.interview_id, auth.uid())
    )
  );

create policy "questions_insert_authenticated_own"
  on public.questions
  for insert
  to authenticated
  with check (auth.uid() is not null and created_by = auth.uid());

create policy "questions_update_own_or_admin"
  on public.questions
  for update
  to authenticated
  using (created_by = auth.uid() or public.is_admin(auth.uid()))
  with check (created_by = auth.uid() or public.is_admin(auth.uid()));

create policy "questions_delete_own_or_admin"
  on public.questions
  for delete
  to authenticated
  using (created_by = auth.uid() or public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- interview_questions
-- ----------------------------------------------------------------------------
create policy "interview_questions_select_participants_or_admin"
  on public.interview_questions
  for select
  to authenticated
  using (
    public.is_interview_participant(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  );

-- Participants (not only creators) may INSERT: the candidate's AI-mock flow
-- attaches its own generated questions.
create policy "interview_questions_insert_participants_or_admin"
  on public.interview_questions
  for insert
  to authenticated
  with check (
    public.is_interview_participant(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "interview_questions_update_creator_or_admin"
  on public.interview_questions
  for update
  to authenticated
  using (
    public.is_interview_creator(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  )
  with check (
    public.is_interview_creator(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "interview_questions_delete_creator_or_admin"
  on public.interview_questions
  for delete
  to authenticated
  using (
    public.is_interview_creator(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  );

-- ----------------------------------------------------------------------------
-- responses
-- ----------------------------------------------------------------------------
create policy "responses_select_candidate_creator_or_admin"
  on public.responses
  for select
  to authenticated
  using (
    candidate_id = auth.uid()
    or public.is_interview_creator(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "responses_insert_candidate_participant"
  on public.responses
  for insert
  to authenticated
  with check (
    candidate_id = auth.uid()
    and public.is_interview_participant(interview_id, auth.uid())
  );

create policy "responses_update_own_or_admin"
  on public.responses
  for update
  to authenticated
  using (candidate_id = auth.uid() or public.is_admin(auth.uid()))
  with check (candidate_id = auth.uid() or public.is_admin(auth.uid()));

create policy "responses_delete_admin_only"
  on public.responses
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- mcq_questions
-- Candidates never read this table directly (correct_option would leak);
-- they receive sanitized questions via the start_mcq_attempt RPC.
-- ----------------------------------------------------------------------------
create policy "mcq_questions_select_staff_or_own"
  on public.mcq_questions
  for select
  to authenticated
  using (
    public.is_interviewer_or_admin(auth.uid())
    or created_by = auth.uid()
  );

create policy "mcq_questions_insert_staff_own"
  on public.mcq_questions
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.is_interviewer_or_admin(auth.uid())
  );

create policy "mcq_questions_update_own_or_admin"
  on public.mcq_questions
  for update
  to authenticated
  using (created_by = auth.uid() or public.is_admin(auth.uid()))
  with check (created_by = auth.uid() or public.is_admin(auth.uid()));

create policy "mcq_questions_delete_own_or_admin"
  on public.mcq_questions
  for delete
  to authenticated
  using (created_by = auth.uid() or public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- mcq_attempts
-- ----------------------------------------------------------------------------
create policy "mcq_attempts_select_candidate_creator_or_admin"
  on public.mcq_attempts
  for select
  to authenticated
  using (
    candidate_id = auth.uid()
    or public.is_admin(auth.uid())
    or (interview_id is not null and public.is_interview_creator(interview_id, auth.uid()))
  );

create policy "mcq_attempts_insert_own"
  on public.mcq_attempts
  for insert
  to authenticated
  with check (candidate_id = auth.uid());

create policy "mcq_attempts_update_own_or_admin"
  on public.mcq_attempts
  for update
  to authenticated
  using (candidate_id = auth.uid() or public.is_admin(auth.uid()))
  with check (candidate_id = auth.uid() or public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- mcq_answers (no UPDATE/DELETE: answers are immutable once written)
-- ----------------------------------------------------------------------------
create policy "mcq_answers_select_attempt_owner_creator_or_admin"
  on public.mcq_answers
  for select
  to authenticated
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1
      from public.mcq_attempts a
      where a.id = mcq_answers.attempt_id
        and (
          a.candidate_id = auth.uid()
          or (a.interview_id is not null and public.is_interview_creator(a.interview_id, auth.uid()))
        )
    )
  );

create policy "mcq_answers_insert_attempt_owner"
  on public.mcq_answers
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.mcq_attempts a
      where a.id = mcq_answers.attempt_id
        and a.candidate_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- ai_analysis
-- ----------------------------------------------------------------------------
create policy "ai_analysis_select_candidate_creator_or_admin"
  on public.ai_analysis
  for select
  to authenticated
  using (
    candidate_id = auth.uid()
    or public.is_interview_creator(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "ai_analysis_insert_participant_or_creator"
  on public.ai_analysis
  for insert
  to authenticated
  with check (
    (candidate_id = auth.uid() and public.is_interview_participant(interview_id, auth.uid()))
    or public.is_interview_creator(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "ai_analysis_update_participant_or_creator"
  on public.ai_analysis
  for update
  to authenticated
  using (
    (candidate_id = auth.uid() and public.is_interview_participant(interview_id, auth.uid()))
    or public.is_interview_creator(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  )
  with check (
    (candidate_id = auth.uid() and public.is_interview_participant(interview_id, auth.uid()))
    or public.is_interview_creator(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "ai_analysis_delete_admin_only"
  on public.ai_analysis
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- interview_results
-- ----------------------------------------------------------------------------
create policy "interview_results_select_candidate_creator_or_admin"
  on public.interview_results
  for select
  to authenticated
  using (
    candidate_id = auth.uid()
    or public.is_interview_creator(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "interview_results_insert_participants_or_admin"
  on public.interview_results
  for insert
  to authenticated
  with check (
    public.is_interview_participant(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "interview_results_update_participants_or_admin"
  on public.interview_results
  for update
  to authenticated
  using (
    public.is_interview_participant(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  )
  with check (
    public.is_interview_participant(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "interview_results_delete_admin_only"
  on public.interview_results
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- interviewer_notes
-- ----------------------------------------------------------------------------
create policy "interviewer_notes_select_author_admin_or_candidate_public"
  on public.interviewer_notes
  for select
  to authenticated
  using (
    interviewer_id = auth.uid()
    or public.is_admin(auth.uid())
    or (
      is_private = false
      and exists (
        select 1
        from public.interviews i
        where i.id = interviewer_notes.interview_id
          and i.candidate_id = auth.uid()
      )
    )
  );

create policy "interviewer_notes_insert_author_creator"
  on public.interviewer_notes
  for insert
  to authenticated
  with check (
    interviewer_id = auth.uid()
    and public.is_interview_creator(interview_id, auth.uid())
  );

create policy "interviewer_notes_update_author_or_admin"
  on public.interviewer_notes
  for update
  to authenticated
  using (interviewer_id = auth.uid() or public.is_admin(auth.uid()))
  with check (interviewer_id = auth.uid() or public.is_admin(auth.uid()));

create policy "interviewer_notes_delete_author_or_admin"
  on public.interviewer_notes
  for delete
  to authenticated
  using (interviewer_id = auth.uid() or public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- interview_invitations
-- ----------------------------------------------------------------------------
create policy "interview_invitations_select_creator_admin_or_invitee"
  on public.interview_invitations
  for select
  to authenticated
  using (
    public.is_interview_creator(interview_id, auth.uid())
    or public.is_admin(auth.uid())
    or candidate_id = auth.uid()
    or lower(candidate_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "interview_invitations_insert_creator"
  on public.interview_invitations
  for insert
  to authenticated
  with check (public.is_interview_creator(interview_id, auth.uid()));

create policy "interview_invitations_update_creator_or_admin"
  on public.interview_invitations
  for update
  to authenticated
  using (
    public.is_interview_creator(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  )
  with check (
    public.is_interview_creator(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "interview_invitations_delete_creator_or_admin"
  on public.interview_invitations
  for delete
  to authenticated
  using (
    public.is_interview_creator(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  );

-- ----------------------------------------------------------------------------
-- recordings
-- ----------------------------------------------------------------------------
create policy "recordings_select_candidate_creator_or_admin"
  on public.recordings
  for select
  to authenticated
  using (
    candidate_id = auth.uid()
    or public.is_interview_creator(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "recordings_insert_candidate_participant"
  on public.recordings
  for insert
  to authenticated
  with check (
    candidate_id = auth.uid()
    and public.is_interview_participant(interview_id, auth.uid())
  );

create policy "recordings_delete_admin_only"
  on public.recordings
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- assessment_events
-- ----------------------------------------------------------------------------
create policy "assessment_events_select_candidate_creator_or_admin"
  on public.assessment_events
  for select
  to authenticated
  using (
    candidate_id = auth.uid()
    or public.is_interview_creator(interview_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "assessment_events_insert_candidate_participant"
  on public.assessment_events
  for insert
  to authenticated
  with check (
    candidate_id = auth.uid()
    and public.is_interview_participant(interview_id, auth.uid())
  );

-- ----------------------------------------------------------------------------
-- audit_logs (append-only for users, readable by admins; no UPDATE/DELETE)
-- ----------------------------------------------------------------------------
create policy "audit_logs_select_admin_only"
  on public.audit_logs
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "audit_logs_insert_own"
  on public.audit_logs
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- platform_settings (world-readable; nothing sensitive is stored here)
-- ----------------------------------------------------------------------------
create policy "platform_settings_select_all"
  on public.platform_settings
  for select
  to anon, authenticated
  using (true);

create policy "platform_settings_insert_admin_only"
  on public.platform_settings
  for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

create policy "platform_settings_update_admin_only"
  on public.platform_settings
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "platform_settings_delete_admin_only"
  on public.platform_settings
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));
