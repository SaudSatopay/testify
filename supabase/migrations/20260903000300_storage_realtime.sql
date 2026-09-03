-- ============================================================================
-- Testify - Migration 3: storage buckets + policies, realtime, default settings
-- ============================================================================
-- Path conventions:
--   avatars/    {user_id}/avatar.*
--   resumes/    {user_id}/...
--   recordings/ {candidate_id}/{interview_id}/...
--   reports/    {interview_id}/...
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Buckets
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('resumes', 'resumes', false, 10485760,
    array['application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('recordings', 'recordings', false, 209715200,
    array['video/webm', 'video/mp4', 'audio/webm', 'audio/mp4', 'audio/mpeg',
          'audio/wav', 'audio/ogg']),
  ('reports', 'reports', false, 20971520,
    array['application/pdf', 'application/json', 'text/html'])
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- storage.objects policies
-- ----------------------------------------------------------------------------

-- ===== avatars: public read, owner-folder write =====
create policy "storage_avatars_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');

create policy "storage_avatars_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_avatars_update_own_folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_avatars_delete_own_folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===== resumes: owner-folder write; read by owner, admins, or interviewers
-- who created an interview with that candidate =====
create policy "storage_resumes_select_owner_admin_or_linked_interviewer"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'resumes'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin(auth.uid())
      or exists (
        select 1
        from public.interviews i
        where i.created_by = auth.uid()
          and i.candidate_id::text = (storage.foldername(name))[1]
      )
    )
  );

create policy "storage_resumes_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_resumes_update_own_folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_resumes_delete_own_folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===== recordings: candidate uploads into {candidate_id}/{interview_id}/...;
-- read by the candidate, admins, or the creator of that interview =====
create policy "storage_recordings_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- CASE guards the ::uuid casts: plain AND does not guarantee short-circuit
-- evaluation in Postgres, so a bare cast could error on non-UUID folder names.
create policy "storage_recordings_select_candidate_creator_or_admin"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'recordings'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin(auth.uid())
      or case
           when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           then public.is_interview_creator(((storage.foldername(name))[2])::uuid, auth.uid())
           else false
         end
    )
  );

create policy "storage_recordings_delete_admin_only"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'recordings'
    and public.is_admin(auth.uid())
  );

-- ===== reports: {interview_id}/... readable/writable by interview
-- participants or admins =====
create policy "storage_reports_select_participants_or_admin"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'reports'
    and (
      case
        when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.is_interview_participant(((storage.foldername(name))[1])::uuid, auth.uid())
        else false
      end
      or public.is_admin(auth.uid())
    )
  );

create policy "storage_reports_insert_participants_or_admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'reports'
    and (
      case
        when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.is_interview_participant(((storage.foldername(name))[1])::uuid, auth.uid())
        else false
      end
      or public.is_admin(auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- Realtime: publish live tables and enable full row images so UPDATE/DELETE
-- payloads carry complete old records.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.interviews,
      public.responses,
      public.interviewer_notes,
      public.assessment_events,
      public.interview_invitations;
  end if;
end
$$;

alter table public.interviews replica identity full;
alter table public.responses replica identity full;
alter table public.interviewer_notes replica identity full;
alter table public.assessment_events replica identity full;
alter table public.interview_invitations replica identity full;

-- ----------------------------------------------------------------------------
-- Default platform settings
-- ----------------------------------------------------------------------------
insert into public.platform_settings (key, value)
values
  ('site_name', '{"value": "Testify"}'::jsonb),
  ('registration_enabled', '{"value": true}'::jsonb),
  ('default_interview_duration', '{"value": 30}'::jsonb),
  ('monitoring_enabled_default', '{"value": false}'::jsonb),
  ('notes_visible_to_candidate_default', '{"value": false}'::jsonb),
  ('ai_provider_hint', '{"value": "openai"}'::jsonb)
on conflict (key) do nothing;
