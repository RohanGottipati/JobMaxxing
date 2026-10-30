-- Maxwell chat turns call Gemini (up to seven requests per turn) and were the
-- only AI path without a per-user daily quota. Give them their own limit.
insert into private.ai_action_limits (action, daily_limit)
values ('maxwell_chat', 60)
on conflict (action) do update set daily_limit = excluded.daily_limit, updated_at = now();

alter table public.ai_usage_events drop constraint if exists ai_usage_events_action_check;
alter table public.ai_usage_events add constraint ai_usage_events_action_check check (
  action in (
    'bullet_rewrite', 'resume_analysis', 'resume_import', 'job_parse', 'job_match',
    'resume_tailoring', 'cover_letter_generation', 'maxwell_chat'
  )
);

alter table public.ai_audit_events drop constraint if exists ai_audit_events_action_check;
alter table public.ai_audit_events add constraint ai_audit_events_action_check check (
  action in (
    'bullet_rewrite', 'resume_analysis', 'resume_import', 'job_parse', 'job_match',
    'resume_tailoring', 'cover_letter_generation', 'maxwell_chat'
  )
);

-- Inside each NOT EXISTS subquery an unqualified `name` resolved to the inner
-- table first, so the master-resume guard compared resumes.file_path with the
-- resume's display name and never protected referenced files. Qualify every
-- comparison with storage.objects.
drop policy if exists "Users can delete own job documents" on storage.objects;
create policy "Users can delete own job documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'job-documents'
    and (storage.foldername(objects.name))[1] = (select auth.uid()::text)
    and owner_id = (select auth.uid()::text)
    and not exists (select 1 from public.resumes r where r.user_id = (select auth.uid()) and r.file_path = objects.name)
    and not exists (select 1 from public.resume_versions v where v.user_id = (select auth.uid()) and v.file_path = objects.name)
    and not exists (select 1 from public.cover_letters c where c.user_id = (select auth.uid()) and c.file_path = objects.name)
    and not exists (select 1 from public.assistant_attachments a where a.user_id = (select auth.uid()) and a.file_path = objects.name)
    and not exists (select 1 from public.resume_imports i where i.user_id = (select auth.uid()) and i.file_path = objects.name)
  );

-- Job links are rendered as clickable links. Only web URLs are accepted, which
-- also covers writes made directly through the Data API. NOT VALID keeps the
-- migration safe for any legacy row while enforcing every new write.
alter table public.applications drop constraint if exists applications_job_url_web_check;
alter table public.applications add constraint applications_job_url_web_check
  check (job_url is null or job_url ~* '^https?://[^[:space:]]+$') not valid;
