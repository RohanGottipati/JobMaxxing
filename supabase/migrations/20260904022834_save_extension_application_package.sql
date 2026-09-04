-- Atomically save an extension application and the exact submitted files used
-- for it. Storage uploads happen before this transaction; the API verifies the
-- objects and removes any unreferenced uploads if this function rejects them.
create or replace function public.save_extension_application_package(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_application_id uuid := nullif(p_payload ->> 'id', '')::uuid;
  v_company_name text := nullif(btrim(p_payload ->> 'company_name'), '');
  v_role_title text := nullif(btrim(p_payload ->> 'role_title'), '');
  v_job_url text := nullif(btrim(p_payload ->> 'job_url'), '');
  v_job_description text := nullif(btrim(p_payload ->> 'job_description'), '');
  v_location text := nullif(btrim(p_payload ->> 'location'), '');
  v_status public.application_status := coalesce(
    nullif(p_payload ->> 'status', '')::public.application_status,
    'applied'::public.application_status
  );
  v_deadline date := nullif(p_payload ->> 'deadline', '')::date;
  v_date_applied date := nullif(p_payload ->> 'date_applied', '')::date;
  v_notes text := nullif(btrim(p_payload ->> 'notes'), '');
  v_referral_contact text := nullif(btrim(p_payload ->> 'referral_contact'), '');
  v_next_action text := nullif(btrim(p_payload ->> 'next_action'), '');
  v_source_host text := nullif(btrim(p_payload ->> 'source_host'), '');
  v_description_hash text := nullif(btrim(p_payload ->> 'description_hash'), '');
  v_recruiting_season text := nullif(btrim(p_payload ->> 'recruiting_season'), '');
  v_resume_path text := nullif(p_payload #>> '{submitted_files,resume,path}', '');
  v_resume_title text := nullif(btrim(p_payload #>> '{submitted_files,resume,file_name}'), '');
  v_cover_path text := nullif(p_payload #>> '{submitted_files,cover_letter,path}', '');
  v_cover_title text := nullif(btrim(p_payload #>> '{submitted_files,cover_letter,file_name}'), '');
  v_prefix text;
  v_position integer;
  v_duplicate record;
  v_resume_id uuid;
  v_cover_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if v_company_name is null or v_role_title is null then
    raise exception 'Company name and role title are required.' using errcode = '22023';
  end if;

  v_prefix := v_user_id::text || '/application-packages/';

  -- Serialize saves for one user so extension duplicate checks and version
  -- numbering remain deterministic under rapid double-clicks.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  if v_application_id is not null then
    select submitted_resume_version_id, submitted_cover_letter_id
      into v_resume_id, v_cover_id
      from public.applications
      where id = v_application_id
        and user_id = v_user_id;

    if not found then
      raise exception 'Application % was not found.', v_application_id
        using errcode = 'P0002';
    end if;
  end if;

  if v_description_hash is not null then
    select id, company_name, role_title, status
      into v_duplicate
      from public.applications
      where user_id = v_user_id
        and description_hash = v_description_hash
        and (v_application_id is null or id <> v_application_id)
      order by created_at desc
      limit 1;

    if found then
      return jsonb_build_object(
        'duplicate_found', true,
        'duplicate', jsonb_build_object(
          'id', v_duplicate.id,
          'company_name', v_duplicate.company_name,
          'role_title', v_duplicate.role_title,
          'status', v_duplicate.status
        )
      );
    end if;
  end if;

  if v_resume_path is not null then
    if v_resume_path not like v_prefix || '%'
      or position('/' in substr(v_resume_path, length(v_prefix) + 1)) > 0
      or position('..' in substr(v_resume_path, length(v_prefix) + 1)) > 0
    then
      raise exception 'Invalid submitted resume path.' using errcode = '22023';
    end if;

    if exists (select 1 from public.resumes where file_path = v_resume_path)
      or exists (select 1 from public.resume_versions where file_path = v_resume_path)
      or exists (select 1 from public.cover_letters where file_path = v_resume_path)
    then
      raise exception 'Submitted resume path is already linked.' using errcode = '23505';
    end if;
  end if;

  if v_cover_path is not null then
    if v_cover_path not like v_prefix || '%'
      or position('/' in substr(v_cover_path, length(v_prefix) + 1)) > 0
      or position('..' in substr(v_cover_path, length(v_prefix) + 1)) > 0
    then
      raise exception 'Invalid submitted cover-letter path.' using errcode = '22023';
    end if;

    if v_cover_path = v_resume_path
      or exists (select 1 from public.resumes where file_path = v_cover_path)
      or exists (select 1 from public.resume_versions where file_path = v_cover_path)
      or exists (select 1 from public.cover_letters where file_path = v_cover_path)
    then
      raise exception 'Submitted cover-letter path is already linked.' using errcode = '23505';
    end if;
  end if;

  if v_application_id is null then
    select coalesce(max(position) + 1, 0)
      into v_position
      from public.applications
      where user_id = v_user_id
        and status = v_status;

    insert into public.applications (
      user_id,
      company_name,
      role_title,
      job_url,
      job_description,
      location,
      status,
      deadline,
      date_applied,
      notes,
      referral_contact,
      next_action,
      source_host,
      description_hash,
      recruiting_season,
      position
    )
    values (
      v_user_id,
      v_company_name,
      v_role_title,
      v_job_url,
      v_job_description,
      v_location,
      v_status,
      v_deadline,
      v_date_applied,
      v_notes,
      v_referral_contact,
      v_next_action,
      v_source_host,
      v_description_hash,
      v_recruiting_season,
      v_position
    )
    returning id into v_application_id;
  else
    update public.applications
      set company_name = v_company_name,
          role_title = v_role_title,
          job_url = v_job_url,
          job_description = v_job_description,
          location = v_location,
          status = v_status,
          deadline = v_deadline,
          date_applied = v_date_applied,
          notes = v_notes,
          referral_contact = v_referral_contact,
          next_action = v_next_action,
          source_host = v_source_host,
          description_hash = v_description_hash,
          recruiting_season = v_recruiting_season
      where id = v_application_id
        and user_id = v_user_id;
  end if;

  if v_resume_path is not null then
    update public.resume_versions
      set is_submitted = false
      where application_id = v_application_id
        and user_id = v_user_id
        and is_submitted;

    insert into public.resume_versions (
      user_id,
      application_id,
      title,
      content,
      file_path,
      job_description_snapshot,
      is_submitted,
      submitted_at
    )
    values (
      v_user_id,
      v_application_id,
      coalesce(v_resume_title, v_company_name || ' — ' || v_role_title || ' Resume'),
      null,
      v_resume_path,
      v_job_description,
      true,
      now()
    )
    returning id into v_resume_id;
  end if;

  if v_cover_path is not null then
    update public.cover_letters
      set is_submitted = false
      where application_id = v_application_id
        and user_id = v_user_id
        and is_submitted;

    insert into public.cover_letters (
      user_id,
      application_id,
      title,
      content,
      file_path,
      job_description_snapshot,
      is_submitted,
      submitted_at
    )
    values (
      v_user_id,
      v_application_id,
      coalesce(v_cover_title, v_company_name || ' — ' || v_role_title || ' Cover Letter'),
      null,
      v_cover_path,
      v_job_description,
      true,
      now()
    )
    returning id into v_cover_id;
  end if;

  update public.applications
    set submitted_resume_version_id = v_resume_id,
        submitted_cover_letter_id = v_cover_id
    where id = v_application_id
      and user_id = v_user_id;

  return jsonb_build_object(
    'duplicate_found', false,
    'application_id', v_application_id,
    'submitted_resume_version_id', v_resume_id,
    'submitted_cover_letter_id', v_cover_id
  );
end;
$$;

revoke all on function public.save_extension_application_package(jsonb) from public;
revoke all on function public.save_extension_application_package(jsonb) from anon;
grant execute on function public.save_extension_application_package(jsonb) to authenticated;
