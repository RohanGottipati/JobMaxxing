-- Attaches the PDF compiled by Overleaf as the document's final file after a
-- successful project sync. The sync cursor proves which document the project
-- is bound to and that the JobMaxxing source has not changed since the sync,
-- so the attached PDF always reflects the current source.
create or replace function public.attach_overleaf_compiled_pdf(
  p_overleaf_project_id text,
  p_storage_path text,
  p_size_bytes bigint
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_kind text;
  v_document_id uuid;
  v_synced_version bigint;
  v_current_version bigint;
  v_old_path text;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_overleaf_project_id is null
    or p_overleaf_project_id !~ '^[A-Za-z0-9_-]{8,80}$'
  then
    raise exception 'Invalid Overleaf project identifier.' using errcode = '22023';
  end if;
  if p_size_bytes is null or p_size_bytes <= 0 or p_size_bytes > 10485760 then
    raise exception 'The compiled PDF must be between 1 byte and 10 MB.'
      using errcode = 'check_violation';
  end if;
  if p_storage_path is null
    or p_storage_path <> pg_catalog.lower(p_storage_path)
    or p_storage_path !~ ('^' || v_user_id::text
      || '/overleaf-compiled/[A-Za-z0-9_-]{8,80}/[0-9a-f-]{36}-[A-Za-z0-9._-]{1,120}\.pdf$')
  then
    raise exception 'Invalid compiled PDF storage path.' using errcode = '22023';
  end if;

  select
    case
      when c.resume_id is not null then 'master_resume'
      when c.resume_version_id is not null then 'resume_version'
      else 'cover_letter'
    end,
    coalesce(c.resume_id, c.resume_version_id, c.cover_letter_id),
    c.last_synced_row_version
    into v_kind, v_document_id, v_synced_version
  from private.latex_overleaf_sync_cursors c
  where c.user_id = v_user_id
    and c.overleaf_project_id = p_overleaf_project_id
  for update;

  if not found then
    raise exception 'This Overleaf project is not linked to a JobMaxxing document. Sync the project first.'
      using errcode = 'P0002';
  end if;

  if v_kind = 'master_resume' then
    select d.row_version, d.file_path
      into v_current_version, v_old_path
    from public.resumes d
    where d.id = v_document_id
      and d.user_id = v_user_id
      and d.content_format = 'latex'
    for update;
  elsif v_kind = 'resume_version' then
    select d.row_version, d.file_path
      into v_current_version, v_old_path
    from public.resume_versions d
    where d.id = v_document_id
      and d.user_id = v_user_id
      and d.content_format = 'latex'
      and d.submitted_at is null
    for update;
  else
    select d.row_version, d.file_path
      into v_current_version, v_old_path
    from public.cover_letters d
    where d.id = v_document_id
      and d.user_id = v_user_id
      and d.content_format = 'latex'
      and d.submitted_at is null
    for update;
  end if;

  if v_current_version is null then
    raise exception 'The document is locked or unavailable.' using errcode = '55000';
  end if;
  if v_current_version <> v_synced_version then
    raise exception 'The document changed in JobMaxxing after the last sync. Sync the project again before attaching its PDF.'
      using errcode = '40001';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'job-documents'
      and o.name = p_storage_path
      and o.owner_id = v_user_id::text
      and coalesce((o.metadata ->> 'size')::bigint, -1) = p_size_bytes
      and coalesce(o.metadata ->> 'mimetype', '') = 'application/pdf'
  ) then
    raise exception 'The staged PDF is unavailable.' using errcode = 'no_data_found';
  end if;

  if v_kind = 'master_resume' then
    update public.resumes
      set file_path = p_storage_path
      where id = v_document_id and user_id = v_user_id;
  elsif v_kind = 'resume_version' then
    update public.resume_versions
      set file_path = p_storage_path
      where id = v_document_id and user_id = v_user_id and submitted_at is null;
  else
    update public.cover_letters
      set file_path = p_storage_path
      where id = v_document_id and user_id = v_user_id and submitted_at is null;
  end if;
  if not found then
    raise exception 'The document is locked or unavailable.' using errcode = '55000';
  end if;

  return pg_catalog.jsonb_build_object(
    'kind', v_kind,
    'documentId', v_document_id,
    'rowVersion', v_current_version,
    'replacedPath', v_old_path
  );
end;
$$;

revoke all on function public.attach_overleaf_compiled_pdf(text, text, bigint) from public, anon;
grant execute on function public.attach_overleaf_compiled_pdf(text, text, bigint) to authenticated;

comment on function public.attach_overleaf_compiled_pdf(text, text, bigint) is
  'Attaches the compiled PDF pulled from a synced Overleaf project as the document final file, guarded by the sync cursor row version.';
