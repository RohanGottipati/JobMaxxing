-- JobMaxxing application package system
--
-- Each application is the hub for a tracked role. Against every application a user can
-- save many tailored resume versions and many cover letter versions, but only ONE resume
-- version and ONE cover letter version may be marked as the final submitted package.
-- Submitted documents are content-locked so the exact materials used for a role are preserved.

-- 1. Extend the application status enum with the additional pipeline stages.
--    (ADD VALUE IF NOT EXISTS keeps this migration safe to re-run.)
alter type public.application_status add value if not exists 'online_assessment' after 'applied';
alter type public.application_status add value if not exists 'final_round' after 'interview';

-- 2. Base resumes — reusable master resumes a user maintains.
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  content text,
  file_path text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Applications — the central hub for each tracked role.
--    submitted_resume_version_id / submitted_cover_letter_id point at the final package
--    documents. Their foreign keys are added after the version tables exist (step 6).
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_name text not null,
  role_title text not null,
  job_url text,
  job_description text,
  location text,
  status public.application_status not null default 'saved',
  deadline date,
  date_applied date,
  notes text,
  referral_contact text,
  next_action text,
  submitted_resume_version_id uuid,
  submitted_cover_letter_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Tailored resume versions saved against a specific application.
create table public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  base_resume_id uuid references public.resumes (id) on delete set null,
  version_number integer not null,
  title text,
  content text,
  file_path text,
  rules_used jsonb,
  job_description_snapshot text,
  is_submitted boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resume_versions_application_version_key unique (application_id, version_number)
);

-- 5. Cover letter versions saved against a specific application.
create table public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  version_number integer not null,
  title text,
  content text,
  file_path text,
  template_used text,
  job_description_snapshot text,
  is_submitted boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cover_letters_application_version_key unique (application_id, version_number)
);

-- 6. Close the circular reference: the application points at its submitted documents.
--    on delete set null so deleting a version simply clears the package pointer.
alter table public.applications
  add constraint applications_submitted_resume_version_id_fkey
  foreign key (submitted_resume_version_id)
  references public.resume_versions (id) on delete set null;

alter table public.applications
  add constraint applications_submitted_cover_letter_id_fkey
  foreign key (submitted_cover_letter_id)
  references public.cover_letters (id) on delete set null;

-- 7. Indexes (ownership lookups, status filtering, and every foreign key).
create index resumes_user_id_idx on public.resumes (user_id);
create index applications_user_id_idx on public.applications (user_id);
create index applications_status_idx on public.applications (status);
create index applications_submitted_resume_version_id_idx on public.applications (submitted_resume_version_id);
create index applications_submitted_cover_letter_id_idx on public.applications (submitted_cover_letter_id);
create index resume_versions_user_id_idx on public.resume_versions (user_id);
create index resume_versions_application_id_idx on public.resume_versions (application_id);
create index resume_versions_base_resume_id_idx on public.resume_versions (base_resume_id);
create index cover_letters_user_id_idx on public.cover_letters (user_id);
create index cover_letters_application_id_idx on public.cover_letters (application_id);

-- 8. Enforce "one submitted document per application" at the database level.
create unique index resume_versions_one_submitted_per_application_idx
  on public.resume_versions (application_id)
  where is_submitted;
create unique index cover_letters_one_submitted_per_application_idx
  on public.cover_letters (application_id)
  where is_submitted;

-- 9. Keep updated_at in sync (reuses public.set_updated_at from the base schema).
--    Pin the shared trigger function's search_path (security hardening flagged by advisors).
alter function public.set_updated_at() set search_path = '';

create trigger resumes_updated_at
  before update on public.resumes
  for each row execute function public.set_updated_at();

create trigger applications_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

create trigger resume_versions_updated_at
  before update on public.resume_versions
  for each row execute function public.set_updated_at();

create trigger cover_letters_updated_at
  before update on public.cover_letters
  for each row execute function public.set_updated_at();

-- 10. Auto-assign the next version number per application when one is not supplied.
create or replace function public.assign_resume_version_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.version_number is null then
    select coalesce(max(version_number), 0) + 1
      into new.version_number
      from public.resume_versions
      where application_id = new.application_id;
  end if;
  return new;
end;
$$;

create trigger resume_versions_assign_version
  before insert on public.resume_versions
  for each row execute function public.assign_resume_version_number();

create or replace function public.assign_cover_letter_version_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.version_number is null then
    select coalesce(max(version_number), 0) + 1
      into new.version_number
      from public.cover_letters
      where application_id = new.application_id;
  end if;
  return new;
end;
$$;

create trigger cover_letters_assign_version
  before insert on public.cover_letters
  for each row execute function public.assign_cover_letter_version_number();

-- 11. Lock submitted documents: while a version is submitted its content cannot be
--     overwritten. Users must duplicate it before editing. Toggling submission on/off
--     and timestamp bookkeeping are still allowed.
create or replace function public.lock_submitted_resume_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_submitted
    and (
      new.content is distinct from old.content
      or new.title is distinct from old.title
      or new.file_path is distinct from old.file_path
      or new.rules_used is distinct from old.rules_used
      or new.job_description_snapshot is distinct from old.job_description_snapshot
      or new.base_resume_id is distinct from old.base_resume_id
      or new.version_number is distinct from old.version_number
    )
  then
    raise exception 'Resume version % is submitted and locked. Duplicate it before editing.', old.id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger resume_versions_lock_submitted
  before update on public.resume_versions
  for each row execute function public.lock_submitted_resume_version();

create or replace function public.lock_submitted_cover_letter()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_submitted
    and (
      new.content is distinct from old.content
      or new.title is distinct from old.title
      or new.file_path is distinct from old.file_path
      or new.template_used is distinct from old.template_used
      or new.job_description_snapshot is distinct from old.job_description_snapshot
      or new.version_number is distinct from old.version_number
    )
  then
    raise exception 'Cover letter % is submitted and locked. Duplicate it before editing.', old.id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger cover_letters_lock_submitted
  before update on public.cover_letters
  for each row execute function public.lock_submitted_cover_letter();

-- 12. Row Level Security: every user can only touch their own rows.
alter table public.resumes enable row level security;
alter table public.applications enable row level security;
alter table public.resume_versions enable row level security;
alter table public.cover_letters enable row level security;

-- resumes
create policy "Users can view own resumes"
  on public.resumes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own resumes"
  on public.resumes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own resumes"
  on public.resumes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own resumes"
  on public.resumes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- applications
create policy "Users can view own applications"
  on public.applications for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own applications"
  on public.applications for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own applications"
  on public.applications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own applications"
  on public.applications for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- resume_versions
create policy "Users can view own resume versions"
  on public.resume_versions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own resume versions"
  on public.resume_versions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own resume versions"
  on public.resume_versions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own resume versions"
  on public.resume_versions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- cover_letters
create policy "Users can view own cover letters"
  on public.cover_letters for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own cover letters"
  on public.cover_letters for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own cover letters"
  on public.cover_letters for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own cover letters"
  on public.cover_letters for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 13. Atomic submission helpers. SECURITY INVOKER so RLS still applies (a user can only
--     submit their own documents). Each call unsets the previously submitted document for
--     the same application, marks the chosen one submitted, and updates the application
--     package pointer — all in a single transaction.
create or replace function public.submit_resume_version(p_version_id uuid)
returns public.resume_versions
language plpgsql
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
    set is_submitted = false, submitted_at = null
    where application_id = v_application_id
      and is_submitted
      and id <> p_version_id;

  update public.resume_versions
    set is_submitted = true, submitted_at = now()
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
    set is_submitted = false, submitted_at = null
    where application_id = v_application_id
      and is_submitted
      and id <> p_cover_letter_id;

  update public.cover_letters
    set is_submitted = true, submitted_at = now()
    where id = p_cover_letter_id
    returning * into v_row;

  update public.applications
    set submitted_cover_letter_id = p_cover_letter_id
    where id = v_application_id;

  return v_row;
end;
$$;

-- 14. Clean read model for a full application package: application details plus the
--     submitted resume version and cover letter, with a computed package status.
--     security_invoker = true ensures the caller's RLS policies apply.
create view public.application_packages
with (security_invoker = true)
as
select
  a.id,
  a.user_id,
  a.company_name,
  a.role_title,
  a.job_url,
  a.job_description,
  a.location,
  a.status,
  a.deadline,
  a.date_applied,
  a.notes,
  a.referral_contact,
  a.next_action,
  a.submitted_resume_version_id,
  a.submitted_cover_letter_id,
  a.created_at,
  a.updated_at,
  case when rv.id is null then null else to_jsonb(rv.*) end as submitted_resume_version,
  case when cl.id is null then null else to_jsonb(cl.*) end as submitted_cover_letter,
  case
    when a.submitted_resume_version_id is not null and a.submitted_cover_letter_id is not null then 'package_complete'
    when a.submitted_resume_version_id is null and a.submitted_cover_letter_id is null then 'package_incomplete'
    when a.submitted_resume_version_id is null then 'resume_missing'
    else 'cover_letter_missing'
  end as package_status
from public.applications a
left join public.resume_versions rv on rv.id = a.submitted_resume_version_id
left join public.cover_letters cl on cl.id = a.submitted_cover_letter_id;

grant select on public.application_packages to authenticated;
