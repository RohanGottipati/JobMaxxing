-- Phase one career foundation
--
-- This migration is additive. Existing career data is preserved, existing
-- resumes remain in the legacy editor, and new user-owned tables are exposed
-- only through explicit grants plus row-level security.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Onboarding and career preferences
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists career_stage text,
  add column if not exists onboarding_status text not null default 'not_started',
  add column if not exists onboarding_step smallint not null default 1,
  add column if not exists onboarding_deferred_at timestamptz,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists ai_processing_consent_at timestamptz,
  add column if not exists profile_revision bigint not null default 0;

update public.profiles
set
  onboarding_status = 'completed',
  onboarding_completed_at = coalesce(onboarding_completed_at, now()),
  onboarding_step = 5
where onboarding_status = 'not_started';

alter table public.profiles
  add constraint profiles_career_stage_check
    check (
      career_stage is null or career_stage in (
        'student', 'new_grad', 'early_career', 'mid_career',
        'senior', 'manager', 'executive', 'career_change'
      )
    ),
  add constraint profiles_onboarding_status_check
    check (onboarding_status in ('not_started', 'in_progress', 'deferred', 'completed')),
  add constraint profiles_onboarding_step_check
    check (onboarding_step between 1 and 5),
  add constraint profiles_profile_revision_check
    check (profile_revision >= 0);

create table public.career_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  target_roles text[] not null default '{}'::text[],
  preferred_locations text[] not null default '{}'::text[],
  work_arrangements text[] not null default '{}'::text[],
  salary_min integer,
  salary_currency text,
  work_authorization_status text,
  requires_sponsorship boolean,
  notification_preferences jsonb not null default '{"email":true,"in_app":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_preferences_target_roles_check check (cardinality(target_roles) <= 20),
  constraint career_preferences_locations_check check (cardinality(preferred_locations) <= 20),
  constraint career_preferences_arrangements_check check (
    work_arrangements <@ array['remote', 'hybrid', 'onsite']::text[]
  ),
  constraint career_preferences_salary_check check (salary_min is null or salary_min >= 0),
  constraint career_preferences_currency_check check (
    salary_currency is null or salary_currency ~ '^[A-Z]{3}$'
  ),
  constraint career_preferences_notifications_check check (
    jsonb_typeof(notification_preferences) = 'object'
  )
);

create trigger career_preferences_updated_at
  before update on public.career_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Canonical career profile additions and provenance
-- ---------------------------------------------------------------------------

alter table public.profile_links
  add column if not exists kind text not null default 'other';
alter table public.profile_links
  add constraint profile_links_kind_check
    check (kind in ('linkedin', 'github', 'portfolio', 'website', 'other'));

alter table public.profile_achievements
  add column if not exists kind text not null default 'achievement';
alter table public.profile_achievements
  add constraint profile_achievements_kind_check
    check (kind in ('achievement', 'award'));

alter table public.profile_experiences
  add column if not exists original_text text,
  add column if not exists approved_text text,
  add column if not exists technologies text[] not null default '{}'::text[],
  add column if not exists demonstrated_skills text[] not null default '{}'::text[],
  add column if not exists metrics jsonb not null default '[]'::jsonb,
  add column if not exists source_kind text not null default 'manual',
  add column if not exists verification_status text not null default 'user_confirmed',
  add column if not exists confidence numeric(4,3),
  add column if not exists is_locked boolean not null default false;

update public.profile_experiences
set
  original_text = coalesce(original_text, responsibilities),
  approved_text = coalesce(approved_text, responsibilities),
  source_kind = 'migration',
  verification_status = 'user_confirmed'
where original_text is null or approved_text is null;

alter table public.profile_projects
  add column if not exists original_text text,
  add column if not exists approved_text text,
  add column if not exists technologies text[] not null default '{}'::text[],
  add column if not exists demonstrated_skills text[] not null default '{}'::text[],
  add column if not exists metrics jsonb not null default '[]'::jsonb,
  add column if not exists source_kind text not null default 'manual',
  add column if not exists verification_status text not null default 'user_confirmed',
  add column if not exists confidence numeric(4,3),
  add column if not exists is_locked boolean not null default false;

update public.profile_projects
set
  original_text = coalesce(original_text, description),
  approved_text = coalesce(approved_text, description),
  source_kind = 'migration',
  verification_status = 'user_confirmed'
where original_text is null or approved_text is null;

alter table public.profile_experiences
  add constraint profile_experiences_metrics_check check (jsonb_typeof(metrics) = 'array'),
  add constraint profile_experiences_source_check check (source_kind in ('manual', 'resume_import', 'migration')),
  add constraint profile_experiences_verification_check check (verification_status in ('unverified', 'user_confirmed', 'source_verified')),
  add constraint profile_experiences_confidence_check check (confidence is null or confidence between 0 and 1);

alter table public.profile_projects
  add constraint profile_projects_metrics_check check (jsonb_typeof(metrics) = 'array'),
  add constraint profile_projects_source_check check (source_kind in ('manual', 'resume_import', 'migration')),
  add constraint profile_projects_verification_check check (verification_status in ('unverified', 'user_confirmed', 'source_verified')),
  add constraint profile_projects_confidence_check check (confidence is null or confidence between 0 and 1);

create table public.profile_certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  issuer text,
  issued_on text,
  expires_on text,
  credential_id text,
  credential_url text,
  position integer not null default 0,
  source_kind text not null default 'manual',
  verification_status text not null default 'user_confirmed',
  confidence numeric(4,3),
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_certifications_source_check check (source_kind in ('manual', 'resume_import', 'migration')),
  constraint profile_certifications_verification_check check (verification_status in ('unverified', 'user_confirmed', 'source_verified')),
  constraint profile_certifications_confidence_check check (confidence is null or confidence between 0 and 1),
  constraint profile_certifications_id_user_key unique (id, user_id)
);

create table public.profile_publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  publisher text,
  published_on text,
  url text,
  description text,
  position integer not null default 0,
  source_kind text not null default 'manual',
  verification_status text not null default 'user_confirmed',
  confidence numeric(4,3),
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_publications_source_check check (source_kind in ('manual', 'resume_import', 'migration')),
  constraint profile_publications_verification_check check (verification_status in ('unverified', 'user_confirmed', 'source_verified')),
  constraint profile_publications_confidence_check check (confidence is null or confidence between 0 and 1),
  constraint profile_publications_id_user_key unique (id, user_id)
);

create table public.profile_languages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  proficiency text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_languages_proficiency_check check (
    proficiency is null or proficiency in ('basic', 'conversational', 'professional', 'native')
  ),
  constraint profile_languages_id_user_key unique (id, user_id)
);

-- Existing tables gain composite keys so child ownership can be enforced by FK.
alter table public.profile_experiences
  add constraint profile_experiences_id_user_key unique (id, user_id);
alter table public.profile_projects
  add constraint profile_projects_id_user_key unique (id, user_id);
alter table public.resumes
  add constraint resumes_id_user_key unique (id, user_id);
alter table public.resume_versions
  add constraint resume_versions_id_user_key unique (id, user_id);
alter table public.applications
  add constraint applications_id_user_key unique (id, user_id);

create table public.profile_bullets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  experience_id uuid,
  project_id uuid,
  original_text text not null,
  approved_text text not null,
  technologies text[] not null default '{}'::text[],
  demonstrated_skills text[] not null default '{}'::text[],
  metrics jsonb not null default '[]'::jsonb,
  source_kind text not null default 'manual',
  verification_status text not null default 'user_confirmed',
  confidence numeric(4,3),
  is_locked boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_bullets_one_parent_check check (num_nonnulls(experience_id, project_id) = 1),
  constraint profile_bullets_text_check check (char_length(approved_text) between 1 and 2000),
  constraint profile_bullets_metrics_check check (jsonb_typeof(metrics) = 'array'),
  constraint profile_bullets_source_check check (source_kind in ('manual', 'resume_import', 'migration')),
  constraint profile_bullets_verification_check check (verification_status in ('unverified', 'user_confirmed', 'source_verified')),
  constraint profile_bullets_confidence_check check (confidence is null or confidence between 0 and 1),
  constraint profile_bullets_experience_user_fkey foreign key (experience_id, user_id)
    references public.profile_experiences (id, user_id) on delete cascade,
  constraint profile_bullets_project_user_fkey foreign key (project_id, user_id)
    references public.profile_projects (id, user_id) on delete cascade,
  constraint profile_bullets_id_user_key unique (id, user_id)
);

create table public.career_profile_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  revision bigint not null,
  snapshot jsonb not null,
  reason text not null default 'save',
  created_at timestamptz not null default now(),
  constraint career_profile_revisions_snapshot_check check (jsonb_typeof(snapshot) = 'object'),
  constraint career_profile_revisions_user_revision_key unique (user_id, revision)
);

-- ---------------------------------------------------------------------------
-- Resume imports and structured resume documents
-- ---------------------------------------------------------------------------

create table public.resume_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_kind text not null,
  status text not null default 'uploaded',
  file_path text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  source_text text,
  page_metadata jsonb not null default '[]'::jsonb,
  parsed_payload jsonb,
  review_payload jsonb,
  warnings jsonb not null default '[]'::jsonb,
  parser_version text,
  ai_requested boolean not null default false,
  ai_used boolean not null default false,
  ai_model text,
  error_code text,
  processing_started_at timestamptz,
  processing_finished_at timestamptz,
  reviewed_at timestamptz,
  committed_at timestamptz,
  committed_resume_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resume_imports_source_check check (source_kind in ('upload', 'paste', 'legacy')),
  constraint resume_imports_status_check check (status in ('uploaded', 'extracting', 'parsing', 'review_required', 'committed', 'failed')),
  constraint resume_imports_size_check check (size_bytes is null or size_bytes between 1 and 10485760),
  constraint resume_imports_page_metadata_check check (jsonb_typeof(page_metadata) = 'array'),
  constraint resume_imports_payload_check check (parsed_payload is null or jsonb_typeof(parsed_payload) = 'object'),
  constraint resume_imports_review_check check (review_payload is null or jsonb_typeof(review_payload) = 'object'),
  constraint resume_imports_warnings_check check (jsonb_typeof(warnings) = 'array'),
  constraint resume_imports_resume_user_fkey foreign key (committed_resume_id, user_id)
    references public.resumes (id, user_id) on delete set null (committed_resume_id)
);

alter table public.resumes
  add column if not exists editor_mode text not null default 'legacy',
  add column if not exists document_schema_version smallint,
  add column if not exists structured_content jsonb,
  add column if not exists template_id text,
  add column if not exists row_version bigint not null default 0;

alter table public.resume_versions
  add column if not exists editor_mode text not null default 'legacy',
  add column if not exists document_schema_version smallint,
  add column if not exists structured_content jsonb,
  add column if not exists template_id text,
  add column if not exists row_version bigint not null default 0;

alter table public.resumes
  add constraint resumes_editor_mode_check check (editor_mode in ('legacy', 'structured')),
  add constraint resumes_structured_content_check check (structured_content is null or jsonb_typeof(structured_content) = 'object'),
  add constraint resumes_row_version_check check (row_version >= 0),
  add constraint resumes_structured_requirements_check check (
    editor_mode = 'legacy' or (document_schema_version = 1 and structured_content is not null and template_id is not null)
  );

alter table public.resume_versions
  add constraint resume_versions_editor_mode_check check (editor_mode in ('legacy', 'structured')),
  add constraint resume_versions_structured_content_check check (structured_content is null or jsonb_typeof(structured_content) = 'object'),
  add constraint resume_versions_row_version_check check (row_version >= 0),
  add constraint resume_versions_structured_requirements_check check (
    editor_mode = 'legacy' or (document_schema_version = 1 and structured_content is not null and template_id is not null)
  );

create table public.resume_document_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resume_id uuid,
  resume_version_id uuid,
  row_version bigint not null,
  title text not null,
  template_id text not null,
  structured_content jsonb not null,
  resolved_snapshot jsonb not null,
  reason text not null default 'checkpoint',
  created_at timestamptz not null default now(),
  constraint resume_document_history_one_parent_check check (num_nonnulls(resume_id, resume_version_id) = 1),
  constraint resume_document_history_content_check check (jsonb_typeof(structured_content) = 'object'),
  constraint resume_document_history_snapshot_check check (jsonb_typeof(resolved_snapshot) = 'object'),
  constraint resume_document_history_resume_user_fkey foreign key (resume_id, user_id)
    references public.resumes (id, user_id) on delete cascade,
  constraint resume_document_history_version_user_fkey foreign key (resume_version_id, user_id)
    references public.resume_versions (id, user_id) on delete cascade
);

create table public.document_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resume_id uuid,
  resume_version_id uuid,
  format text not null,
  status text not null default 'processing',
  row_version bigint not null,
  file_name text,
  size_bytes bigint,
  duration_ms integer,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint document_exports_one_parent_check check (num_nonnulls(resume_id, resume_version_id) = 1),
  constraint document_exports_format_check check (format in ('pdf', 'docx')),
  constraint document_exports_status_check check (status in ('processing', 'succeeded', 'failed')),
  constraint document_exports_resume_user_fkey foreign key (resume_id, user_id)
    references public.resumes (id, user_id) on delete cascade,
  constraint document_exports_version_user_fkey foreign key (resume_version_id, user_id)
    references public.resume_versions (id, user_id) on delete cascade
);

-- Enforce same-owner application/document relationships for all future writes.
alter table public.resume_versions
  add constraint resume_versions_application_user_fkey foreign key (application_id, user_id)
    references public.applications (id, user_id) on delete cascade,
  add constraint resume_versions_base_resume_user_fkey foreign key (base_resume_id, user_id)
    references public.resumes (id, user_id) on delete set null (base_resume_id);

alter table public.cover_letters
  add constraint cover_letters_application_user_fkey foreign key (application_id, user_id)
    references public.applications (id, user_id) on delete cascade;

-- ---------------------------------------------------------------------------
-- Indexes, RLS, triggers, and explicit Data API privileges
-- ---------------------------------------------------------------------------

create index career_profile_revisions_user_created_idx
  on public.career_profile_revisions (user_id, created_at desc);
create index profile_certifications_user_position_idx
  on public.profile_certifications (user_id, position);
create index profile_publications_user_position_idx
  on public.profile_publications (user_id, position);
create index profile_languages_user_position_idx
  on public.profile_languages (user_id, position);
create index profile_bullets_experience_position_idx
  on public.profile_bullets (experience_id, position) where experience_id is not null;
create index profile_bullets_project_position_idx
  on public.profile_bullets (project_id, position) where project_id is not null;
create index profile_bullets_user_idx on public.profile_bullets (user_id);
create index resume_imports_user_updated_idx on public.resume_imports (user_id, updated_at desc);
create index resume_imports_user_status_idx on public.resume_imports (user_id, status);
create index resume_imports_committed_resume_idx on public.resume_imports (committed_resume_id)
  where committed_resume_id is not null;
create index resume_document_history_resume_created_idx
  on public.resume_document_history (resume_id, created_at desc) where resume_id is not null;
create index resume_document_history_version_created_idx
  on public.resume_document_history (resume_version_id, created_at desc) where resume_version_id is not null;
create index resume_document_history_user_idx on public.resume_document_history (user_id);
create index document_exports_user_created_idx on public.document_exports (user_id, created_at desc);
create index document_exports_resume_idx on public.document_exports (resume_id) where resume_id is not null;
create index document_exports_version_idx on public.document_exports (resume_version_id) where resume_version_id is not null;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'career_preferences',
    'profile_certifications',
    'profile_publications',
    'profile_languages',
    'profile_bullets',
    'career_profile_revisions',
    'resume_imports',
    'resume_document_history',
    'document_exports'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
  end loop;
end
$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'career_profile_revisions',
    'resume_document_history',
    'document_exports'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      'Users can view own ' || tbl,
      tbl
    );
  end loop;
end
$$;

create policy "Users can manage own career preferences"
  on public.career_preferences for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can manage own profile certifications"
  on public.profile_certifications for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can manage own profile publications"
  on public.profile_publications for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can manage own profile languages"
  on public.profile_languages for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can manage own profile bullets"
  on public.profile_bullets for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can create own career profile revisions"
  on public.career_profile_revisions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can manage own resume imports"
  on public.resume_imports for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can create own resume history"
  on public.resume_document_history for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can create own document exports"
  on public.document_exports for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own document exports"
  on public.document_exports for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'career_preferences',
    'profile_certifications',
    'profile_publications',
    'profile_languages',
    'profile_bullets',
    'career_profile_revisions',
    'resume_imports',
    'resume_document_history',
    'document_exports'
  ]
  loop
    execute format('revoke all on table public.%I from anon', tbl);
  end loop;
end
$$;

grant select, insert, update, delete on public.career_preferences to authenticated;
grant select, insert, update, delete on public.profile_certifications to authenticated;
grant select, insert, update, delete on public.profile_publications to authenticated;
grant select, insert, update, delete on public.profile_languages to authenticated;
grant select, insert, update, delete on public.profile_bullets to authenticated;
grant select, insert on public.career_profile_revisions to authenticated;
grant select, insert, update, delete on public.resume_imports to authenticated;
grant select, insert on public.resume_document_history to authenticated;
grant select, insert, update on public.document_exports to authenticated;

create trigger profile_certifications_updated_at before update on public.profile_certifications
  for each row execute function public.set_updated_at();
create trigger profile_publications_updated_at before update on public.profile_publications
  for each row execute function public.set_updated_at();
create trigger profile_languages_updated_at before update on public.profile_languages
  for each row execute function public.set_updated_at();
create trigger profile_bullets_updated_at before update on public.profile_bullets
  for each row execute function public.set_updated_at();
create trigger resume_imports_updated_at before update on public.resume_imports
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Optimistic structured-document writes and immutable history checkpoints
-- ---------------------------------------------------------------------------

create or replace function public.save_structured_resume_document(
  p_kind text,
  p_document_id uuid,
  p_expected_version bigint,
  p_title text,
  p_template_id text,
  p_document jsonb
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_version bigint;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_kind not in ('master', 'tailored') or jsonb_typeof(p_document) <> 'object' then
    raise exception 'Invalid structured resume payload.' using errcode = '22023';
  end if;

  if p_kind = 'master' then
    update public.resumes
    set name = p_title,
        editor_mode = 'structured',
        document_schema_version = 1,
        structured_content = p_document,
        template_id = p_template_id,
        row_version = row_version + 1
    where id = p_document_id
      and user_id = v_user_id
      and row_version = p_expected_version
    returning row_version into v_version;
  else
    update public.resume_versions
    set title = p_title,
        editor_mode = 'structured',
        document_schema_version = 1,
        structured_content = p_document,
        template_id = p_template_id,
        row_version = row_version + 1
    where id = p_document_id
      and user_id = v_user_id
      and submitted_at is null
      and row_version = p_expected_version
    returning row_version into v_version;
  end if;

  if v_version is null then
    raise exception 'The resume changed in another session or is unavailable.' using errcode = '40001';
  end if;

  -- Keep recoverable snapshots without writing a history row on every
  -- debounced editor save. A user who edits continuously receives at most one
  -- automatic checkpoint every five minutes.
  if p_kind = 'master' then
    insert into public.resume_document_history (
      user_id, resume_id, row_version, title, template_id,
      structured_content, resolved_snapshot, reason
    )
    select user_id, id, row_version, name, template_id,
      structured_content,
      pg_catalog.jsonb_build_object('schemaVersion', 1, 'document', structured_content),
      'autosave'
    from public.resumes r
    where r.id = p_document_id and r.user_id = v_user_id
      and not exists (
        select 1 from public.resume_document_history h
        where h.resume_id = r.id and h.user_id = v_user_id
          and h.created_at > pg_catalog.now() - interval '5 minutes'
      );
  else
    insert into public.resume_document_history (
      user_id, resume_version_id, row_version, title, template_id,
      structured_content, resolved_snapshot, reason
    )
    select user_id, id, row_version, coalesce(title, 'Tailored resume'), template_id,
      structured_content,
      pg_catalog.jsonb_build_object('schemaVersion', 1, 'document', structured_content),
      'autosave'
    from public.resume_versions r
    where r.id = p_document_id and r.user_id = v_user_id
      and not exists (
        select 1 from public.resume_document_history h
        where h.resume_version_id = r.id and h.user_id = v_user_id
          and h.created_at > pg_catalog.now() - interval '5 minutes'
      );
  end if;

  return v_version;
end;
$$;

create or replace function public.checkpoint_structured_resume_document(
  p_kind text,
  p_document_id uuid,
  p_expected_version bigint,
  p_resolved_snapshot jsonb,
  p_reason text default 'checkpoint'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_history_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_kind = 'master' then
    insert into public.resume_document_history (
      user_id, resume_id, row_version, title, template_id,
      structured_content, resolved_snapshot, reason
    )
    select user_id, id, row_version, name, template_id,
      structured_content, p_resolved_snapshot, left(coalesce(p_reason, 'checkpoint'), 80)
    from public.resumes
    where id = p_document_id and user_id = v_user_id
      and row_version = p_expected_version and editor_mode = 'structured'
    returning id into v_history_id;
  elsif p_kind = 'tailored' then
    insert into public.resume_document_history (
      user_id, resume_version_id, row_version, title, template_id,
      structured_content, resolved_snapshot, reason
    )
    select user_id, id, row_version, coalesce(title, 'Tailored resume'), template_id,
      structured_content, p_resolved_snapshot, left(coalesce(p_reason, 'checkpoint'), 80)
    from public.resume_versions
    where id = p_document_id and user_id = v_user_id
      and row_version = p_expected_version and editor_mode = 'structured'
    returning id into v_history_id;
  else
    raise exception 'Invalid resume kind.' using errcode = '22023';
  end if;

  if v_history_id is null then
    raise exception 'The resume changed before the checkpoint was saved.' using errcode = '40001';
  end if;
  return v_history_id;
end;
$$;

revoke all on function public.save_structured_resume_document(text, uuid, bigint, text, text, jsonb)
  from public, anon;
grant execute on function public.save_structured_resume_document(text, uuid, bigint, text, text, jsonb)
  to authenticated;
revoke all on function public.checkpoint_structured_resume_document(text, uuid, bigint, jsonb, text)
  from public, anon;
grant execute on function public.checkpoint_structured_resume_document(text, uuid, bigint, jsonb, text)
  to authenticated;

-- Submitted structured content is immutable alongside the legacy fields.
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
      or new.editor_mode is distinct from old.editor_mode
      or new.document_schema_version is distinct from old.document_schema_version
      or new.structured_content is distinct from old.structured_content
      or new.template_id is distinct from old.template_id
      or new.row_version is distinct from old.row_version
    )
  then
    raise exception 'Resume version % was submitted and is locked. Duplicate it before editing.', old.id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Serialize per-application numbering so concurrent inserts cannot select the
-- same max(version_number) value.
create or replace function public.assign_resume_version_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.application_id::text, 11));
  if new.version_number is null then
    select coalesce(max(version_number), 0) + 1 into new.version_number
    from public.resume_versions where application_id = new.application_id;
  end if;
  return new;
end;
$$;

create or replace function public.assign_cover_letter_version_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.application_id::text, 12));
  if new.version_number is null then
    select coalesce(max(version_number), 0) + 1 into new.version_number
    from public.cover_letters where application_id = new.application_id;
  end if;
  return new;
end;
$$;

-- Imported source files cannot be removed while an import references them.
drop policy if exists "Users can delete own job documents" on storage.objects;
create policy "Users can delete own job documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'job-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and owner_id = (select auth.uid()::text)
    and not exists (select 1 from public.resumes where user_id = (select auth.uid()) and file_path = name)
    and not exists (select 1 from public.resume_versions where user_id = (select auth.uid()) and file_path = name)
    and not exists (select 1 from public.cover_letters where user_id = (select auth.uid()) and file_path = name)
    and not exists (select 1 from public.assistant_attachments where user_id = (select auth.uid()) and file_path = name)
    and not exists (select 1 from public.resume_imports where user_id = (select auth.uid()) and file_path = name)
  );

-- ---------------------------------------------------------------------------
-- Atomic canonical-profile save and import commit
-- ---------------------------------------------------------------------------

create or replace function public.save_career_profile(
  p_payload jsonb,
  p_expected_revision bigint
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_revision bigint;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid career profile payload.' using errcode = '22023';
  end if;

  select profile_revision into v_revision
  from public.profiles
  where id = v_user_id
  for update;

  if v_revision is null or v_revision <> p_expected_revision then
    raise exception 'The career profile changed in another session.' using errcode = '40001';
  end if;

  update public.profiles
  set
    full_name = nullif(p_payload ->> 'full_name', ''),
    headline = nullif(p_payload ->> 'headline', ''),
    phone = nullif(p_payload ->> 'phone', ''),
    location = nullif(p_payload ->> 'location', ''),
    summary = nullif(p_payload ->> 'summary', ''),
    additional_info = nullif(p_payload ->> 'additional_info', ''),
    career_stage = nullif(p_payload ->> 'career_stage', ''),
    profile_revision = profile_revision + 1
  where id = v_user_id
  returning profile_revision into v_revision;

  insert into public.career_preferences (
    user_id, target_roles, preferred_locations, work_arrangements,
    salary_min, salary_currency, work_authorization_status, requires_sponsorship
  )
  values (
    v_user_id,
    coalesce(array(select jsonb_array_elements_text(p_payload #> '{preferences,target_roles}')), '{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(p_payload #> '{preferences,preferred_locations}')), '{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(p_payload #> '{preferences,work_arrangements}')), '{}'::text[]),
    nullif(p_payload #>> '{preferences,salary_min}', '')::integer,
    nullif(p_payload #>> '{preferences,salary_currency}', ''),
    nullif(p_payload #>> '{preferences,work_authorization_status}', ''),
    nullif(p_payload #>> '{preferences,requires_sponsorship}', '')::boolean
  )
  on conflict (user_id) do update set
    target_roles = excluded.target_roles,
    preferred_locations = excluded.preferred_locations,
    work_arrangements = excluded.work_arrangements,
    salary_min = excluded.salary_min,
    salary_currency = excluded.salary_currency,
    work_authorization_status = excluded.work_authorization_status,
    requires_sponsorship = excluded.requires_sponsorship;

  insert into public.profile_links (id, user_id, kind, label, url, position)
  select id, v_user_id, kind, label, url, position
  from jsonb_to_recordset(coalesce(p_payload -> 'links', '[]'::jsonb))
    as x(id uuid, kind text, label text, url text, position integer)
  on conflict (id) do update set
    kind = excluded.kind, label = excluded.label, url = excluded.url,
    position = excluded.position
  where profile_links.user_id = v_user_id;
  delete from public.profile_links t where t.user_id = v_user_id
    and not exists (
      select 1 from jsonb_to_recordset(coalesce(p_payload -> 'links', '[]'::jsonb)) as x(id uuid)
      where x.id = t.id
    );

  insert into public.profile_experiences (
    id, user_id, kind, job_title, company, location, start_date, end_date,
    is_current, responsibilities, original_text, approved_text, technologies,
    demonstrated_skills, metrics, source_kind, verification_status, confidence,
    is_locked, position
  )
  select id, v_user_id, kind::public.profile_experience_kind, job_title, company,
    nullif(location, ''), nullif(start_date, ''), case when is_current then null else nullif(end_date, '') end,
    is_current, nullif(approved_text, ''), nullif(original_text, ''), nullif(approved_text, ''),
    coalesce(technologies, '{}'::text[]), coalesce(demonstrated_skills, '{}'::text[]),
    coalesce(metrics, '[]'::jsonb), source_kind, verification_status, confidence,
    is_locked, position
  from jsonb_to_recordset(coalesce(p_payload -> 'experiences', '[]'::jsonb))
    as x(
      id uuid, kind text, job_title text, company text, location text,
      start_date text, end_date text, is_current boolean, original_text text,
      approved_text text, technologies text[], demonstrated_skills text[], metrics jsonb,
      source_kind text, verification_status text, confidence numeric, is_locked boolean,
      position integer
    )
  on conflict (id) do update set
    kind = excluded.kind, job_title = excluded.job_title, company = excluded.company,
    location = excluded.location, start_date = excluded.start_date, end_date = excluded.end_date,
    is_current = excluded.is_current, responsibilities = excluded.responsibilities,
    original_text = excluded.original_text, approved_text = excluded.approved_text,
    technologies = excluded.technologies, demonstrated_skills = excluded.demonstrated_skills,
    metrics = excluded.metrics, source_kind = excluded.source_kind,
    verification_status = excluded.verification_status, confidence = excluded.confidence,
    is_locked = excluded.is_locked, position = excluded.position
  where profile_experiences.user_id = v_user_id;

  insert into public.profile_education (
    id, user_id, school, degree, field, location, start_date, end_date,
    is_current, details, position
  )
  select id, v_user_id, school, nullif(degree, ''), nullif(field, ''), nullif(location, ''),
    nullif(start_date, ''), case when is_current then null else nullif(end_date, '') end,
    is_current, nullif(details, ''), position
  from jsonb_to_recordset(coalesce(p_payload -> 'education', '[]'::jsonb))
    as x(id uuid, school text, degree text, field text, location text, start_date text,
      end_date text, is_current boolean, details text, position integer)
  on conflict (id) do update set
    school = excluded.school, degree = excluded.degree, field = excluded.field,
    location = excluded.location, start_date = excluded.start_date, end_date = excluded.end_date,
    is_current = excluded.is_current, details = excluded.details, position = excluded.position
  where profile_education.user_id = v_user_id;

  insert into public.profile_projects (
    id, user_id, title, date, url, description, tech_stack, original_text,
    approved_text, technologies, demonstrated_skills, metrics, source_kind,
    verification_status, confidence, is_locked, position
  )
  select id, v_user_id, title, nullif(date, ''), nullif(url, ''), nullif(approved_text, ''),
    nullif(array_to_string(coalesce(technologies, '{}'::text[]), ', '), ''),
    nullif(original_text, ''), nullif(approved_text, ''), coalesce(technologies, '{}'::text[]),
    coalesce(demonstrated_skills, '{}'::text[]), coalesce(metrics, '[]'::jsonb),
    source_kind, verification_status, confidence, is_locked, position
  from jsonb_to_recordset(coalesce(p_payload -> 'projects', '[]'::jsonb))
    as x(id uuid, title text, date text, url text, original_text text, approved_text text,
      technologies text[], demonstrated_skills text[], metrics jsonb, source_kind text,
      verification_status text, confidence numeric, is_locked boolean, position integer)
  on conflict (id) do update set
    title = excluded.title, date = excluded.date, url = excluded.url,
    description = excluded.description, tech_stack = excluded.tech_stack,
    original_text = excluded.original_text, approved_text = excluded.approved_text,
    technologies = excluded.technologies, demonstrated_skills = excluded.demonstrated_skills,
    metrics = excluded.metrics, source_kind = excluded.source_kind,
    verification_status = excluded.verification_status, confidence = excluded.confidence,
    is_locked = excluded.is_locked, position = excluded.position
  where profile_projects.user_id = v_user_id;

  insert into public.profile_skills (id, user_id, name, position)
  select id, v_user_id, name, position
  from jsonb_to_recordset(coalesce(p_payload -> 'skills', '[]'::jsonb))
    as x(id uuid, name text, position integer)
  on conflict (id) do update set name = excluded.name, position = excluded.position
  where profile_skills.user_id = v_user_id;

  insert into public.profile_achievements (id, user_id, kind, title, description, date, position)
  select id, v_user_id, kind, title, nullif(description, ''), nullif(date, ''), position
  from jsonb_to_recordset(coalesce(p_payload -> 'achievements', '[]'::jsonb))
    as x(id uuid, kind text, title text, description text, date text, position integer)
  on conflict (id) do update set kind = excluded.kind, title = excluded.title,
    description = excluded.description, date = excluded.date, position = excluded.position
  where profile_achievements.user_id = v_user_id;

  insert into public.profile_certifications (
    id, user_id, name, issuer, issued_on, expires_on, credential_id, credential_url,
    source_kind, verification_status, confidence, is_locked, position
  )
  select id, v_user_id, name, nullif(issuer, ''), nullif(issued_on, ''), nullif(expires_on, ''),
    nullif(credential_id, ''), nullif(credential_url, ''), source_kind,
    verification_status, confidence, is_locked, position
  from jsonb_to_recordset(coalesce(p_payload -> 'certifications', '[]'::jsonb))
    as x(id uuid, name text, issuer text, issued_on text, expires_on text,
      credential_id text, credential_url text, source_kind text,
      verification_status text, confidence numeric, is_locked boolean, position integer)
  on conflict (id) do update set name = excluded.name, issuer = excluded.issuer,
    issued_on = excluded.issued_on, expires_on = excluded.expires_on,
    credential_id = excluded.credential_id, credential_url = excluded.credential_url,
    source_kind = excluded.source_kind, verification_status = excluded.verification_status,
    confidence = excluded.confidence, is_locked = excluded.is_locked, position = excluded.position
  where profile_certifications.user_id = v_user_id;

  insert into public.profile_publications (
    id, user_id, title, publisher, published_on, url, description,
    source_kind, verification_status, confidence, is_locked, position
  )
  select id, v_user_id, title, nullif(publisher, ''), nullif(published_on, ''),
    nullif(url, ''), nullif(description, ''), source_kind, verification_status,
    confidence, is_locked, position
  from jsonb_to_recordset(coalesce(p_payload -> 'publications', '[]'::jsonb))
    as x(id uuid, title text, publisher text, published_on text, url text,
      description text, source_kind text, verification_status text,
      confidence numeric, is_locked boolean, position integer)
  on conflict (id) do update set title = excluded.title, publisher = excluded.publisher,
    published_on = excluded.published_on, url = excluded.url, description = excluded.description,
    source_kind = excluded.source_kind, verification_status = excluded.verification_status,
    confidence = excluded.confidence, is_locked = excluded.is_locked, position = excluded.position
  where profile_publications.user_id = v_user_id;

  insert into public.profile_languages (id, user_id, name, proficiency, position)
  select id, v_user_id, name, nullif(proficiency, ''), position
  from jsonb_to_recordset(coalesce(p_payload -> 'languages', '[]'::jsonb))
    as x(id uuid, name text, proficiency text, position integer)
  on conflict (id) do update set name = excluded.name,
    proficiency = excluded.proficiency, position = excluded.position
  where profile_languages.user_id = v_user_id;

  -- Remove profile items omitted by the submitted snapshot only after all
  -- upserts succeed. Parent deletion cascades its bullets.
  delete from public.profile_experiences t where t.user_id = v_user_id
    and not exists (select 1 from jsonb_to_recordset(coalesce(p_payload -> 'experiences', '[]'::jsonb)) as x(id uuid) where x.id = t.id);
  delete from public.profile_education t where t.user_id = v_user_id
    and not exists (select 1 from jsonb_to_recordset(coalesce(p_payload -> 'education', '[]'::jsonb)) as x(id uuid) where x.id = t.id);
  delete from public.profile_projects t where t.user_id = v_user_id
    and not exists (select 1 from jsonb_to_recordset(coalesce(p_payload -> 'projects', '[]'::jsonb)) as x(id uuid) where x.id = t.id);
  delete from public.profile_skills t where t.user_id = v_user_id
    and not exists (select 1 from jsonb_to_recordset(coalesce(p_payload -> 'skills', '[]'::jsonb)) as x(id uuid) where x.id = t.id);
  delete from public.profile_achievements t where t.user_id = v_user_id
    and not exists (select 1 from jsonb_to_recordset(coalesce(p_payload -> 'achievements', '[]'::jsonb)) as x(id uuid) where x.id = t.id);
  delete from public.profile_certifications t where t.user_id = v_user_id
    and not exists (select 1 from jsonb_to_recordset(coalesce(p_payload -> 'certifications', '[]'::jsonb)) as x(id uuid) where x.id = t.id);
  delete from public.profile_publications t where t.user_id = v_user_id
    and not exists (select 1 from jsonb_to_recordset(coalesce(p_payload -> 'publications', '[]'::jsonb)) as x(id uuid) where x.id = t.id);
  delete from public.profile_languages t where t.user_id = v_user_id
    and not exists (select 1 from jsonb_to_recordset(coalesce(p_payload -> 'languages', '[]'::jsonb)) as x(id uuid) where x.id = t.id);

  -- Bullets are flattened by the server serializer with exactly one parent.
  insert into public.profile_bullets (
    id, user_id, experience_id, project_id, original_text, approved_text,
    technologies, demonstrated_skills, metrics, source_kind, verification_status,
    confidence, is_locked, position
  )
  select id, v_user_id, experience_id, project_id, original_text, approved_text,
    coalesce(technologies, '{}'::text[]), coalesce(demonstrated_skills, '{}'::text[]),
    coalesce(metrics, '[]'::jsonb), source_kind, verification_status,
    confidence, is_locked, position
  from jsonb_to_recordset(coalesce(p_payload -> 'bullets', '[]'::jsonb))
    as x(id uuid, experience_id uuid, project_id uuid, original_text text,
      approved_text text, technologies text[], demonstrated_skills text[], metrics jsonb,
      source_kind text, verification_status text, confidence numeric, is_locked boolean,
      position integer)
  on conflict (id) do update set experience_id = excluded.experience_id,
    project_id = excluded.project_id, original_text = excluded.original_text,
    approved_text = excluded.approved_text, technologies = excluded.technologies,
    demonstrated_skills = excluded.demonstrated_skills, metrics = excluded.metrics,
    source_kind = excluded.source_kind, verification_status = excluded.verification_status,
    confidence = excluded.confidence, is_locked = excluded.is_locked,
    position = excluded.position
  where profile_bullets.user_id = v_user_id;
  delete from public.profile_bullets t where t.user_id = v_user_id
    and not exists (select 1 from jsonb_to_recordset(coalesce(p_payload -> 'bullets', '[]'::jsonb)) as x(id uuid) where x.id = t.id);

  insert into public.career_profile_revisions (user_id, revision, snapshot, reason)
  values (v_user_id, v_revision, p_payload, 'save');

  return v_revision;
end;
$$;

create or replace function public.commit_resume_import(
  p_import_id uuid,
  p_profile_payload jsonb,
  p_expected_profile_revision bigint,
  p_resume_name text,
  p_template_id text,
  p_resume_document jsonb,
  p_onboarding boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_profile_revision bigint;
  v_resume_id uuid;
  v_file_path text;
  v_default boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select file_path into v_file_path
  from public.resume_imports
  where id = p_import_id and user_id = v_user_id and status = 'review_required'
  for update;
  if not found then
    raise exception 'The resume import is not ready for review.' using errcode = '55000';
  end if;

  v_profile_revision := public.save_career_profile(p_profile_payload, p_expected_profile_revision);
  select not exists(select 1 from public.resumes where user_id = v_user_id) into v_default;

  insert into public.resumes (
    user_id, name, file_path, is_default, editor_mode,
    document_schema_version, structured_content, template_id, row_version
  )
  values (
    v_user_id, p_resume_name, v_file_path, v_default, 'structured',
    1, p_resume_document, p_template_id, 0
  )
  returning id into v_resume_id;

  update public.resume_imports
  set status = 'committed', review_payload = p_profile_payload,
    reviewed_at = now(), committed_at = now(), committed_resume_id = v_resume_id
  where id = p_import_id and user_id = v_user_id;

  if p_onboarding then
    update public.profiles
    set onboarding_status = 'in_progress', onboarding_step = greatest(onboarding_step, 3)
    where id = v_user_id and onboarding_status <> 'completed';
  end if;

  return jsonb_build_object(
    'resume_id', v_resume_id,
    'profile_revision', v_profile_revision
  );
end;
$$;

revoke all on function public.save_career_profile(jsonb, bigint) from public, anon;
grant execute on function public.save_career_profile(jsonb, bigint) to authenticated;
revoke all on function public.commit_resume_import(uuid, jsonb, bigint, text, text, jsonb, boolean)
  from public, anon;
grant execute on function public.commit_resume_import(uuid, jsonb, bigint, text, text, jsonb, boolean)
  to authenticated;

create or replace function public.claim_resume_import(
  p_import_id uuid,
  p_use_ai boolean default false
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_status text;
  v_started_at timestamptz;
  v_recovered boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select status, processing_started_at into v_status, v_started_at
  from public.resume_imports
  where id = p_import_id and user_id = v_user_id
  for update;
  if not found then
    raise exception 'Resume import not found.' using errcode = 'P0002';
  end if;

  if v_status in ('extracting', 'parsing')
    and v_started_at < pg_catalog.now() - interval '10 minutes'
  then
    v_recovered := true;
  elsif v_status not in ('uploaded', 'failed') then
    raise exception 'Resume import is already processing or cannot be retried.' using errcode = '55000';
  end if;

  update public.resume_imports
  set status = 'extracting', error_code = null,
    processing_started_at = pg_catalog.now(), processing_finished_at = null,
    ai_requested = p_use_ai
  where id = p_import_id and user_id = v_user_id;

  return v_recovered;
end;
$$;

revoke all on function public.claim_resume_import(uuid, boolean) from public, anon;
grant execute on function public.claim_resume_import(uuid, boolean) to authenticated;
