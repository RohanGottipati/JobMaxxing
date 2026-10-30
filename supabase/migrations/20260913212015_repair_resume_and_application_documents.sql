-- Resume imports keep their immutable source object. The committed master resume
-- receives a separate object so replacing/removing it never destroys import history.
create or replace function public.commit_resume_import_v2(
  p_import_id uuid,
  p_profile_payload jsonb,
  p_expected_profile_revision bigint,
  p_resume_name text,
  p_template_id text,
  p_resume_document jsonb,
  p_resume_id uuid,
  p_resume_file_path text default null,
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
  v_default boolean;
  v_source_path text;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select file_path into v_source_path
  from public.resume_imports
  where id = p_import_id and user_id = v_user_id and status = 'review_required'
  for update;
  if not found then
    raise exception 'The resume import is not ready for review.' using errcode = '55000';
  end if;

  if p_resume_file_path is not null and (
    p_resume_file_path not like v_user_id::text || '/master-resumes/' || p_resume_id::text || '/%'
    or p_resume_file_path = v_source_path
    or exists (select 1 from public.resumes where file_path = p_resume_file_path)
    or exists (select 1 from public.resume_versions where file_path = p_resume_file_path)
  ) then
    raise exception 'Invalid or already-linked resume file path.' using errcode = '22023';
  end if;

  v_profile_revision := public.save_career_profile(p_profile_payload, p_expected_profile_revision);
  select not exists(select 1 from public.resumes where user_id = v_user_id) into v_default;

  insert into public.resumes (
    id, user_id, name, file_path, is_default, editor_mode,
    document_schema_version, structured_content, template_id, row_version
  ) values (
    p_resume_id, v_user_id, p_resume_name, p_resume_file_path, v_default, 'structured',
    1, p_resume_document, p_template_id, 0
  );

  update public.resume_imports
  set status = 'committed', review_payload = p_profile_payload,
    reviewed_at = now(), committed_at = now(), committed_resume_id = p_resume_id
  where id = p_import_id and user_id = v_user_id;

  if p_onboarding then
    update public.profiles
    set onboarding_status = 'in_progress', onboarding_step = greatest(onboarding_step, 3)
    where id = v_user_id and onboarding_status <> 'completed';
  end if;

  return jsonb_build_object('resume_id', p_resume_id, 'profile_revision', v_profile_revision);
end;
$$;

revoke all on function public.commit_resume_import_v2(uuid, jsonb, bigint, text, text, jsonb, uuid, text, boolean) from public, anon;

grant execute on function public.commit_resume_import_v2(uuid, jsonb, bigint, text, text, jsonb, uuid, text, boolean) to authenticated;

-- Replace, choose, or detach an application's submitted resume in one short
-- transaction. Every replacement is a new immutable version; prior submissions
-- retain submitted_at as an audit trail.
create or replace function public.set_application_submitted_resume(
  p_application_id uuid,
  p_source_kind text,
  p_source_id uuid default null,
  p_file_path text default null,
  p_file_name text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_application public.applications%rowtype;
  v_master public.resumes%rowtype;
  v_version public.resume_versions%rowtype;
  v_new_id uuid;
  v_title text;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_source_kind not in ('upload', 'master_resume', 'resume_version', 'detach') then
    raise exception 'Invalid resume source.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_application_id::text, 23));
  select * into v_application from public.applications
  where id = p_application_id and user_id = v_user_id for update;
  if not found then
    raise exception 'Application not found.' using errcode = 'P0002';
  end if;

  if p_source_kind = 'detach' then
    update public.resume_versions set is_submitted = false
    where id = v_application.submitted_resume_version_id and user_id = v_user_id;
    update public.applications set submitted_resume_version_id = null
    where id = p_application_id and user_id = v_user_id;
    return null;
  end if;

  if p_file_path is not null and (
    p_file_path not like v_user_id::text || '/application-packages/%'
    or position('/' in substr(p_file_path, length(v_user_id::text || '/application-packages/') + 1)) > 0
    or position('..' in substr(p_file_path, length(v_user_id::text || '/application-packages/') + 1)) > 0
    or exists (select 1 from public.resumes where file_path = p_file_path)
    or exists (select 1 from public.resume_versions where file_path = p_file_path)
    or exists (select 1 from public.cover_letters where file_path = p_file_path)
  ) then
    raise exception 'Invalid or already-linked application resume path.' using errcode = '22023';
  end if;

  if p_source_kind = 'master_resume' then
    select * into v_master from public.resumes
    where id = p_source_id and user_id = v_user_id;
    if not found then raise exception 'Master resume not found.' using errcode = 'P0002'; end if;
    v_title := v_master.name;
  elsif p_source_kind = 'resume_version' then
    select * into v_version from public.resume_versions
    where id = p_source_id and user_id = v_user_id;
    if not found then raise exception 'Resume version not found.' using errcode = 'P0002'; end if;
    v_title := v_version.title;
  else
    if p_file_path is null then raise exception 'Uploaded resume path is required.' using errcode = '22023'; end if;
    v_title := nullif(btrim(p_file_name), '');
  end if;

  update public.resume_versions set is_submitted = false
  where application_id = p_application_id and user_id = v_user_id and is_submitted;

  insert into public.resume_versions (
    user_id, application_id, base_resume_id, title, content, file_path, rules_used,
    job_description_snapshot, is_submitted, submitted_at, content_format,
    generation_metadata, editor_mode, document_schema_version, structured_content,
    template_id, row_version
  ) values (
    v_user_id, p_application_id,
    case when p_source_kind = 'master_resume' then v_master.id
         when p_source_kind = 'resume_version' then v_version.base_resume_id end,
    coalesce(v_title, v_application.company_name || ' — ' || v_application.role_title || ' Resume'),
    case when p_source_kind = 'master_resume' then v_master.content
         when p_source_kind = 'resume_version' then v_version.content end,
    p_file_path,
    case when p_source_kind = 'resume_version' then v_version.rules_used end,
    v_application.job_description,
    true, now(),
    coalesce(case when p_source_kind = 'master_resume' then v_master.content_format
         when p_source_kind = 'resume_version' then v_version.content_format end, 'plain_text'),
    coalesce(case when p_source_kind = 'master_resume' then v_master.generation_metadata
         when p_source_kind = 'resume_version' then v_version.generation_metadata end, '{}'::jsonb),
    coalesce(case when p_source_kind = 'master_resume' then v_master.editor_mode
         when p_source_kind = 'resume_version' then v_version.editor_mode end, 'legacy'),
    case when p_source_kind = 'master_resume' then v_master.document_schema_version
         when p_source_kind = 'resume_version' then v_version.document_schema_version end,
    case when p_source_kind = 'master_resume' then v_master.structured_content
         when p_source_kind = 'resume_version' then v_version.structured_content end,
    case when p_source_kind = 'master_resume' then v_master.template_id
         when p_source_kind = 'resume_version' then v_version.template_id end,
    0
  ) returning id into v_new_id;

  update public.applications set submitted_resume_version_id = v_new_id
  where id = p_application_id and user_id = v_user_id;
  return v_new_id;
end;
$$;

revoke all on function public.set_application_submitted_resume(uuid, text, uuid, text, text) from public, anon;

grant execute on function public.set_application_submitted_resume(uuid, text, uuid, text, text) to authenticated;

-- Resume-import classification has its own quota and audit category.
insert into private.ai_action_limits (action, daily_limit)
values ('resume_import', 12)
on conflict (action) do update set daily_limit = excluded.daily_limit, updated_at = now();

alter table public.ai_usage_events drop constraint if exists ai_usage_events_action_check;

alter table public.ai_usage_events add constraint ai_usage_events_action_check check (
  action in ('bullet_rewrite', 'resume_analysis', 'resume_import', 'job_parse', 'job_match', 'resume_tailoring', 'cover_letter_generation')
);

alter table public.ai_audit_events drop constraint if exists ai_audit_events_action_check;

alter table public.ai_audit_events add constraint ai_audit_events_action_check check (
  action in ('bullet_rewrite', 'resume_analysis', 'resume_import', 'job_parse', 'job_match', 'resume_tailoring', 'cover_letter_generation')
);
