-- Secure document storage and one-default-resume enforcement.

-- Keep one reusable resume as the default for each user. Existing duplicate
-- defaults are normalized deterministically before the partial unique index is
-- created so this migration remains safe for populated projects.
with ranked_defaults as (
  select
    id,
    row_number() over (
      partition by user_id
      order by updated_at desc, created_at desc, id
    ) as preference_rank
  from public.resumes
  where is_default
)
update public.resumes as resume
set is_default = false
from ranked_defaults
where resume.id = ranked_defaults.id
  and ranked_defaults.preference_rank > 1;

create unique index if not exists resumes_one_default_per_user_idx
  on public.resumes (user_id)
  where is_default;

create or replace function public.set_default_resume(p_resume_id uuid)
returns public.resumes
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_resume public.resumes;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.resumes
    where id = p_resume_id
      and user_id = v_user_id
  ) then
    raise exception 'Resume % was not found.', p_resume_id using errcode = 'P0002';
  end if;

  -- Clear the previous default before promoting the requested resume. Keeping
  -- these as two statements avoids transient partial-index conflicts.
  update public.resumes
  set is_default = false
  where user_id = v_user_id
    and id <> p_resume_id
    and is_default;

  update public.resumes
  set is_default = true
  where id = p_resume_id
    and user_id = v_user_id;

  select *
  into v_resume
  from public.resumes
  where id = p_resume_id
    and user_id = v_user_id;

  return v_resume;
end;
$$;

revoke all on function public.set_default_resume(uuid) from public;
revoke all on function public.set_default_resume(uuid) from anon;
grant execute on function public.set_default_resume(uuid) to authenticated;

-- A submitted timestamp is permanent history, while is_submitted identifies the
-- version currently connected to the application package. Selecting a newer
-- version must not make an older submitted document editable again.
create or replace function public.lock_submitted_resume_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.submitted_at is not null
    and (
      new.content is distinct from old.content
      or new.title is distinct from old.title
      or new.file_path is distinct from old.file_path
      or new.rules_used is distinct from old.rules_used
      or new.job_description_snapshot is distinct from old.job_description_snapshot
      or new.base_resume_id is distinct from old.base_resume_id
      or new.version_number is distinct from old.version_number
      or new.submitted_at is distinct from old.submitted_at
    )
  then
    raise exception 'Resume version % was submitted and is locked. Duplicate it before editing.', old.id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace function public.lock_submitted_cover_letter()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.submitted_at is not null
    and (
      new.content is distinct from old.content
      or new.title is distinct from old.title
      or new.file_path is distinct from old.file_path
      or new.template_used is distinct from old.template_used
      or new.job_description_snapshot is distinct from old.job_description_snapshot
      or new.version_number is distinct from old.version_number
      or new.submitted_at is distinct from old.submitted_at
    )
  then
    raise exception 'Cover letter % was submitted and is locked. Duplicate it before editing.', old.id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace function public.submit_resume_version(p_version_id uuid)
returns public.resume_versions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_application_id uuid;
  v_row public.resume_versions;
begin
  select application_id
    into v_application_id
    from public.resume_versions
    where id = p_version_id;

  if v_application_id is null then
    raise exception 'Resume version % not found', p_version_id using errcode = 'no_data_found';
  end if;

  update public.resume_versions
    set is_submitted = false
    where application_id = v_application_id
      and is_submitted
      and id <> p_version_id;

  update public.resume_versions
    set is_submitted = true,
        submitted_at = coalesce(submitted_at, now())
    where id = p_version_id
    returning * into v_row;

  update public.applications
    set submitted_resume_version_id = p_version_id
    where id = v_application_id;

  return v_row;
end;
$$;

create or replace function public.submit_cover_letter(p_cover_letter_id uuid)
returns public.cover_letters
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_application_id uuid;
  v_row public.cover_letters;
begin
  select application_id
    into v_application_id
    from public.cover_letters
    where id = p_cover_letter_id;

  if v_application_id is null then
    raise exception 'Cover letter % not found', p_cover_letter_id using errcode = 'no_data_found';
  end if;

  update public.cover_letters
    set is_submitted = false
    where application_id = v_application_id
      and is_submitted
      and id <> p_cover_letter_id;

  update public.cover_letters
    set is_submitted = true,
        submitted_at = coalesce(submitted_at, now())
    where id = p_cover_letter_id
    returning * into v_row;

  update public.applications
    set submitted_cover_letter_id = p_cover_letter_id
    where id = v_application_id;

  return v_row;
end;
$$;

revoke all on function public.submit_resume_version(uuid) from public;
revoke all on function public.submit_resume_version(uuid) from anon;
grant execute on function public.submit_resume_version(uuid) to authenticated;
revoke all on function public.submit_cover_letter(uuid) from public;
revoke all on function public.submit_cover_letter(uuid) from anon;
grant execute on function public.submit_cover_letter(uuid) to authenticated;

-- Direct deletes are allowed only for drafts. Foreign-key cascades still remove
-- application-specific history when the owning application itself is deleted.
drop policy if exists "Users can delete own resume versions"
  on public.resume_versions;
create policy "Users can delete own resume versions"
  on public.resume_versions for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and submitted_at is null
  );

drop policy if exists "Users can delete own cover letters"
  on public.cover_letters;
create policy "Users can delete own cover letters"
  on public.cover_letters for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and submitted_at is null
  );

-- Uploaded resumes and cover letters are private by default. The application
-- stores only object paths and generates short-lived signed URLs on demand.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'job-documents',
  'job-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read own job documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'job-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and owner_id = (select auth.uid()::text)
  );

create policy "Users can upload own job documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'job-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can delete own job documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'job-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and owner_id = (select auth.uid()::text)
    and not exists (
      select 1
      from public.resume_versions as resume_version
      where resume_version.user_id = (select auth.uid())
        and resume_version.file_path = name
        and resume_version.submitted_at is not null
    )
    and not exists (
      select 1
      from public.cover_letters as cover_letter
      where cover_letter.user_id = (select auth.uid())
        and cover_letter.file_path = name
        and cover_letter.submitted_at is not null
    )
  );
