-- COALESCE, NULLIF, GREATEST, and LEAST are parser constructs, not pg_catalog
-- functions, so schema-qualifying them raised 42883 at execution time. The
-- original migration created the bodies successfully because plpgsql resolves
-- expressions lazily. Redefine the affected functions with bare constructs;
-- logic, signatures, and privileges are unchanged.

create or replace function public.enqueue_latex_storage_cleanup(
  p_paths text[]
)
returns uuid[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_path text;
  v_ids uuid[];
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_paths is null or coalesce(pg_catalog.array_length(p_paths, 1), 0) > 100 then
    raise exception 'Invalid LaTeX cleanup paths.' using errcode = '22023';
  end if;

  foreach v_path in array p_paths
  loop
    if v_path is null
      or v_path not like v_user_id::text || '/%'
      or pg_catalog.length(v_path) > 1024
      or v_path ~ '(^|/)\.\.?(/|$)'
    then
      raise exception 'Invalid LaTeX cleanup path.' using errcode = '22023';
    end if;
  end loop;

  insert into private.latex_storage_cleanup_queue (user_id, storage_path)
  select v_user_id, queued_path.storage_path
  from pg_catalog.unnest(p_paths) as queued_path(storage_path)
  on conflict (user_id, storage_path) do nothing;

  select coalesce(pg_catalog.array_agg(q.id), array[]::uuid[])
    into v_ids
  from private.latex_storage_cleanup_queue q
  where q.user_id = v_user_id
    and q.storage_path = any(p_paths);

  return v_ids;
end;
$$;

revoke all on function public.enqueue_latex_storage_cleanup(
  text[]
) from public, anon;
grant execute on function public.enqueue_latex_storage_cleanup(
  text[]
) to authenticated;

create or replace function public.pending_latex_storage_cleanup(
  p_limit integer default 100
)
returns table (id uuid, storage_path text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  delete from private.latex_storage_cleanup_queue q
  where q.user_id = v_user_id
    and exists (
      select 1
      from public.latex_document_assets a
      where a.user_id = v_user_id
        and a.storage_path = q.storage_path
    );

  return query
  select q.id, q.storage_path
  from private.latex_storage_cleanup_queue q
  where q.user_id = v_user_id
    and q.created_at <= pg_catalog.now() - interval '15 minutes'
  order by q.created_at, q.id
  limit least(
    greatest(coalesce(p_limit, 100), 1),
    100
  );
end;
$$;

revoke all on function public.pending_latex_storage_cleanup(
  integer
) from public, anon;
grant execute on function public.pending_latex_storage_cleanup(
  integer
) to authenticated;

create or replace function public.acknowledge_latex_storage_cleanup(
  p_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_ids is null or coalesce(pg_catalog.array_length(p_ids, 1), 0) > 100 then
    raise exception 'Invalid LaTeX cleanup identifiers.' using errcode = '22023';
  end if;

  delete from private.latex_storage_cleanup_queue q
  where q.user_id = v_user_id
    and q.id = any(p_ids);
end;
$$;

revoke all on function public.acknowledge_latex_storage_cleanup(
  uuid[]
) from public, anon;
grant execute on function public.acknowledge_latex_storage_cleanup(
  uuid[]
) to authenticated;

create or replace function public.preflight_latex_document_from_overleaf(
  p_link_id uuid,
  p_overleaf_project_id text,
  p_source text,
  p_assets jsonb
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
  v_manifest_version integer;
  v_origin_row_version bigint;
  v_current_version bigint;
  v_current_source text;
  v_locked boolean := false;
  v_cursor_id uuid;
  v_cursor_origin_version bigint;
  v_cursor_synced_version bigint;
  v_cursor_matches_document boolean;
  v_expected_version bigint;
  v_assets_match boolean;
  v_reusable_assets jsonb;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_overleaf_project_id is null
    or p_overleaf_project_id !~ '^[A-Za-z0-9_-]{8,80}$'
  then
    raise exception 'Invalid Overleaf project identifier.' using errcode = '22023';
  end if;
  if p_source is null or pg_catalog.length(p_source) > 2000000 then
    raise exception 'Invalid LaTeX source.' using errcode = '22023';
  end if;
  if p_assets is null
    or pg_catalog.jsonb_typeof(p_assets) <> 'array'
    or pg_catalog.jsonb_array_length(p_assets) > 20
  then
    raise exception 'Project assets must be a JSON array.' using errcode = '22023';
  end if;

  select
    case
      when l.resume_id is not null then 'master_resume'
      when l.resume_version_id is not null then 'resume_version'
      else 'cover_letter'
    end,
    coalesce(l.resume_id, l.resume_version_id, l.cover_letter_id),
    l.manifest_version,
    l.origin_row_version
    into v_kind, v_document_id, v_manifest_version, v_origin_row_version
  from private.latex_overleaf_sync_links l
  where l.id = p_link_id
    and l.user_id = v_user_id;

  if not found then
    raise exception 'The JobMaxxing sync link is invalid.' using errcode = 'P0002';
  end if;

  if v_kind = 'master_resume' then
    select d.row_version, coalesce(d.content, ''), false
      into v_current_version, v_current_source, v_locked
    from public.resumes d
    where d.id = v_document_id
      and d.user_id = v_user_id
      and d.content_format = 'latex'
    for share;
  elsif v_kind = 'resume_version' then
    select d.row_version, coalesce(d.content, ''), d.submitted_at is not null
      into v_current_version, v_current_source, v_locked
    from public.resume_versions d
    where d.id = v_document_id
      and d.user_id = v_user_id
      and d.content_format = 'latex'
    for share;
  else
    select d.row_version, coalesce(d.content, ''), d.submitted_at is not null
      into v_current_version, v_current_source, v_locked
    from public.cover_letters d
    where d.id = v_document_id
      and d.user_id = v_user_id
      and d.content_format = 'latex'
    for share;
  end if;

  if v_current_version is null then
    raise exception 'The document is unavailable.' using errcode = 'P0002';
  end if;

  select
    c.id,
    c.origin_row_version,
    c.last_synced_row_version,
    (
      (v_kind = 'master_resume' and c.resume_id = v_document_id)
      or (v_kind = 'resume_version' and c.resume_version_id = v_document_id)
      or (v_kind = 'cover_letter' and c.cover_letter_id = v_document_id)
    )
    into
      v_cursor_id,
      v_cursor_origin_version,
      v_cursor_synced_version,
      v_cursor_matches_document
  from private.latex_overleaf_sync_cursors c
  where c.user_id = v_user_id
    and c.overleaf_project_id = p_overleaf_project_id;

  if v_cursor_synced_version is not null
    and (
      v_cursor_matches_document is not true
      or v_cursor_origin_version <> v_origin_row_version
    )
  then
    raise exception 'The Overleaf sync manifest does not match this project.'
      using errcode = '22023';
  end if;

  v_expected_version := coalesce(v_cursor_synced_version, v_origin_row_version);
  select
    pg_catalog.count(*) = pg_catalog.jsonb_array_length(p_assets)
    and not exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_assets) item
      left join public.latex_document_assets a
        on a.user_id = v_user_id
        and (
          (v_kind = 'master_resume' and a.resume_id = v_document_id)
          or (v_kind = 'resume_version' and a.resume_version_id = v_document_id)
          or (v_kind = 'cover_letter' and a.cover_letter_id = v_document_id)
        )
        and a.file_name = item ->> 'fileName'
        and a.content_type = item ->> 'contentType'
        and a.size_bytes = case
          when (item ->> 'sizeBytes') ~ '^[0-9]+$'
            then (item ->> 'sizeBytes')::bigint
        end
        and a.content_hash = item ->> 'contentHash'
        and exists (
          select 1
          from storage.objects o
          where o.bucket_id = 'latex-workspaces'
            and o.name = a.storage_path
            and o.owner_id = v_user_id::text
            and coalesce((o.metadata ->> 'size')::bigint, -1) = a.size_bytes
            and coalesce(o.metadata ->> 'mimetype', '') = a.content_type
        )
      where a.id is null
    )
    into v_assets_match
  from public.latex_document_assets existing
  where existing.user_id = v_user_id
    and (
      (v_kind = 'master_resume' and existing.resume_id = v_document_id)
      or (v_kind = 'resume_version' and existing.resume_version_id = v_document_id)
      or (v_kind = 'cover_letter' and existing.cover_letter_id = v_document_id)
    );

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'fileName', a.file_name,
        'storagePath', a.storage_path,
        'contentType', a.content_type,
        'sizeBytes', a.size_bytes,
        'contentHash', a.content_hash
      )
      order by a.file_name
    ),
    '[]'::jsonb
  )
    into v_reusable_assets
  from public.latex_document_assets a
  where a.user_id = v_user_id
    and a.content_hash is not null
    and exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'latex-workspaces'
        and o.name = a.storage_path
        and o.owner_id = v_user_id::text
        and coalesce((o.metadata ->> 'size')::bigint, -1) = a.size_bytes
        and coalesce(o.metadata ->> 'mimetype', '') = a.content_type
    )
    and (
      (v_kind = 'master_resume' and a.resume_id = v_document_id)
      or (v_kind = 'resume_version' and a.resume_version_id = v_document_id)
      or (v_kind = 'cover_letter' and a.cover_letter_id = v_document_id)
    );

  v_status := case
    when v_locked then 'locked'
    when v_current_version <> v_expected_version then 'conflict'
    when v_current_version = v_expected_version
      and v_assets_match
      and v_current_source = p_source
      then 'unchanged'
    else 'ready'
  end;

  if v_status = 'unchanged' and v_cursor_id is null then
    insert into private.latex_overleaf_sync_cursors (
      user_id,
      resume_id,
      resume_version_id,
      cover_letter_id,
      overleaf_project_id,
      manifest_version,
      origin_row_version,
      last_synced_row_version
    )
    values (
      v_user_id,
      case when v_kind = 'master_resume' then v_document_id end,
      case when v_kind = 'resume_version' then v_document_id end,
      case when v_kind = 'cover_letter' then v_document_id end,
      p_overleaf_project_id,
      v_manifest_version,
      v_origin_row_version,
      v_current_version
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'kind', v_kind,
    'documentId', v_document_id,
    'manifestVersion', v_manifest_version,
    'originRowVersion', v_origin_row_version,
    'rowVersion', v_current_version,
    'reusableAssets', v_reusable_assets,
    'status', v_status
  );
end;
$$;

revoke all on function public.preflight_latex_document_from_overleaf(
  uuid, text, text, jsonb
) from public, anon;
grant execute on function public.preflight_latex_document_from_overleaf(
  uuid, text, text, jsonb
) to authenticated;

create or replace function public.sync_latex_document_from_overleaf(
  p_link_id uuid,
  p_overleaf_project_id text,
  p_source text,
  p_assets jsonb,
  p_sync_id uuid
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
  v_manifest_version integer;
  v_origin_row_version bigint;
  v_current_version bigint;
  v_current_source text;
  v_expected_version bigint;
  v_next_version bigint;
  v_cursor_id uuid;
  v_cursor_origin_version bigint;
  v_cursor_synced_version bigint;
  v_cursor_matches_document boolean;
  v_asset jsonb;
  v_asset_count integer := 0;
  v_asset_total bigint := 0;
  v_file_name text;
  v_storage_path text;
  v_content_type text;
  v_content_hash text;
  v_size_bytes bigint;
  v_expected_prefix text;
  v_replaced_paths text[] := array[]::text[];
  v_cleanup_ids uuid[] := array[]::uuid[];
  v_assets_match boolean;
  v_is_reused boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_overleaf_project_id is null
    or p_overleaf_project_id !~ '^[A-Za-z0-9_-]{8,80}$'
  then
    raise exception 'Invalid Overleaf project identifier.' using errcode = '22023';
  end if;
  if p_sync_id is null then
    raise exception 'Invalid synchronization identifier.' using errcode = '22023';
  end if;
  if p_source is null then
    raise exception 'main.tex is required.' using errcode = '22023';
  end if;
  if pg_catalog.length(p_source) > 2000000 then
    raise exception 'LaTeX source must be 2 MB or smaller.' using errcode = '22023';
  end if;
  if p_assets is null or pg_catalog.jsonb_typeof(p_assets) <> 'array' then
    raise exception 'Project assets must be a JSON array.' using errcode = '22023';
  end if;

  select
    case
      when l.resume_id is not null then 'master_resume'
      when l.resume_version_id is not null then 'resume_version'
      else 'cover_letter'
    end,
    coalesce(l.resume_id, l.resume_version_id, l.cover_letter_id),
    l.manifest_version,
    l.origin_row_version
    into v_kind, v_document_id, v_manifest_version, v_origin_row_version
  from private.latex_overleaf_sync_links l
  where l.id = p_link_id
    and l.user_id = v_user_id;

  if not found then
    raise exception 'The JobMaxxing sync link is invalid.' using errcode = 'P0002';
  end if;

  if v_kind = 'master_resume' then
    select d.row_version, coalesce(d.content, '')
      into v_current_version, v_current_source
    from public.resumes d
    where d.id = v_document_id
      and d.user_id = v_user_id
      and d.content_format = 'latex'
    for update;
  elsif v_kind = 'resume_version' then
    select d.row_version, coalesce(d.content, '')
      into v_current_version, v_current_source
    from public.resume_versions d
    where d.id = v_document_id
      and d.user_id = v_user_id
      and d.content_format = 'latex'
      and d.submitted_at is null
    for update;
  else
    select d.row_version, coalesce(d.content, '')
      into v_current_version, v_current_source
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

  select
    c.id,
    c.origin_row_version,
    c.last_synced_row_version,
    (
      (v_kind = 'master_resume' and c.resume_id = v_document_id)
      or (v_kind = 'resume_version' and c.resume_version_id = v_document_id)
      or (v_kind = 'cover_letter' and c.cover_letter_id = v_document_id)
    )
    into
      v_cursor_id,
      v_cursor_origin_version,
      v_cursor_synced_version,
      v_cursor_matches_document
  from private.latex_overleaf_sync_cursors c
  where c.user_id = v_user_id
    and c.overleaf_project_id = p_overleaf_project_id
  for update;

  if v_cursor_id is not null
    and (
      v_cursor_matches_document is not true
      or v_cursor_origin_version <> v_origin_row_version
    )
  then
    raise exception 'The Overleaf sync manifest does not match this project.'
      using errcode = '22023';
  end if;

  v_expected_version := coalesce(v_cursor_synced_version, v_origin_row_version);
  if v_current_version <> v_expected_version then
    raise exception 'The document changed in JobMaxxing after this Overleaf copy was created.'
      using errcode = '40001';
  end if;

  v_expected_prefix :=
    v_user_id::text || '/' ||
    case v_kind
      when 'master_resume' then 'master-resumes'
      when 'resume_version' then 'resume-versions'
      else 'cover-letters'
    end ||
    '/' || v_document_id::text || '/sync/' || p_sync_id::text || '/';

  for v_asset in select value from pg_catalog.jsonb_array_elements(p_assets)
  loop
    v_asset_count := v_asset_count + 1;
    if v_asset_count > 20 or pg_catalog.jsonb_typeof(v_asset) <> 'object' then
      raise exception 'A LaTeX document can hold at most 20 supporting files.'
        using errcode = 'check_violation';
    end if;

    v_file_name := v_asset ->> 'fileName';
    v_storage_path := v_asset ->> 'storagePath';
    v_content_type := v_asset ->> 'contentType';
    v_content_hash := v_asset ->> 'contentHash';
    begin
      v_size_bytes := (v_asset ->> 'sizeBytes')::bigint;
    exception when others then
      raise exception 'Invalid project asset metadata.' using errcode = '22023';
    end;

    if v_file_name is null
      or pg_catalog.length(v_file_name) not between 1 and 240
      or v_file_name !~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,239}$'
      or v_file_name like '%..%'
      or v_file_name like '%//%'
      or v_file_name like '%/./%'
      or pg_catalog.strpos(v_file_name, pg_catalog.chr(92)) > 0
      or pg_catalog.right(v_file_name, 1) = '/'
      or pg_catalog.lower(v_file_name) !~ '\.(tex|png|jpg|jpeg|pdf|ttf|otf|cls|sty|bib|bst)$'
      or pg_catalog.lower(v_file_name) in ('main.tex', 'jobmaxxing-sync.json')
    then
      raise exception 'Unsupported or unsafe project file name.' using errcode = '22023';
    end if;
    if v_content_type is null or v_content_type not in (
      'application/pdf',
      'application/x-tex',
      'image/png',
      'image/jpeg',
      'font/ttf',
      'font/otf',
      'text/plain'
    ) then
      raise exception 'Unsupported project file content type.' using errcode = '22023';
    end if;
    if v_content_hash is null or v_content_hash !~ '^[0-9a-f]{64}$' then
      raise exception 'Invalid project file content hash.' using errcode = '22023';
    end if;
    if v_size_bytes is null or v_size_bytes <= 0 or v_size_bytes > 5242880 then
      raise exception 'Each supporting file must be between 1 byte and 5 MB.'
        using errcode = 'check_violation';
    end if;
    v_is_reused := false;
    if v_storage_path is null then
      raise exception 'Invalid project storage path.' using errcode = '22023';
    elsif v_storage_path <> (v_expected_prefix || v_file_name) then
      select exists (
        select 1
        from public.latex_document_assets a
        where a.user_id = v_user_id
          and (
            (v_kind = 'master_resume' and a.resume_id = v_document_id)
            or (v_kind = 'resume_version' and a.resume_version_id = v_document_id)
            or (v_kind = 'cover_letter' and a.cover_letter_id = v_document_id)
          )
          and a.file_name = v_file_name
          and a.storage_path = v_storage_path
          and a.content_type = v_content_type
          and a.size_bytes = v_size_bytes
          and a.content_hash = v_content_hash
      )
        into v_is_reused;
      if not v_is_reused then
        raise exception 'Invalid project storage path.' using errcode = '22023';
      end if;
    end if;
    if not exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'latex-workspaces'
        and o.name = v_storage_path
        and o.owner_id = v_user_id::text
        and coalesce((o.metadata ->> 'size')::bigint, -1) = v_size_bytes
        and coalesce(o.metadata ->> 'mimetype', '') = v_content_type
    ) then
      raise exception 'A staged project file is unavailable.' using errcode = 'no_data_found';
    end if;

    v_asset_total := v_asset_total + v_size_bytes;
    if v_asset_total > 20971520 then
      raise exception 'Supporting files for a LaTeX document must total 20 MB or less.'
        using errcode = 'check_violation';
    end if;
  end loop;

  select
    pg_catalog.count(*) = pg_catalog.jsonb_array_length(p_assets)
    and not exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_assets) item
      left join public.latex_document_assets a
        on a.user_id = v_user_id
        and (
          (v_kind = 'master_resume' and a.resume_id = v_document_id)
          or (v_kind = 'resume_version' and a.resume_version_id = v_document_id)
          or (v_kind = 'cover_letter' and a.cover_letter_id = v_document_id)
        )
        and a.file_name = item ->> 'fileName'
        and a.content_type = item ->> 'contentType'
        and a.size_bytes = (item ->> 'sizeBytes')::bigint
        and a.content_hash = item ->> 'contentHash'
      where a.id is null
    )
    into v_assets_match
  from public.latex_document_assets existing
  where existing.user_id = v_user_id
    and (
      (v_kind = 'master_resume' and existing.resume_id = v_document_id)
      or (v_kind = 'resume_version' and existing.resume_version_id = v_document_id)
      or (v_kind = 'cover_letter' and existing.cover_letter_id = v_document_id)
    );

  if v_current_source = p_source and v_assets_match then
    if v_cursor_id is null then
      insert into private.latex_overleaf_sync_cursors (
        user_id,
        resume_id,
        resume_version_id,
        cover_letter_id,
        overleaf_project_id,
        manifest_version,
        origin_row_version,
        last_synced_row_version
      )
      values (
        v_user_id,
        case when v_kind = 'master_resume' then v_document_id end,
        case when v_kind = 'resume_version' then v_document_id end,
        case when v_kind = 'cover_letter' then v_document_id end,
        p_overleaf_project_id,
        v_manifest_version,
        v_origin_row_version,
        v_current_version
      );
    else
      update private.latex_overleaf_sync_cursors
      set last_synced_row_version = v_current_version
      where id = v_cursor_id and user_id = v_user_id;
    end if;

    return pg_catalog.jsonb_build_object(
      'rowVersion', v_current_version,
      'replacedPaths', '[]'::jsonb,
      'cleanupIds', '[]'::jsonb,
      'unchanged', true
    );
  end if;

  if v_kind = 'master_resume' then
    insert into public.document_source_history (
      user_id, resume_id, row_version, title, content_format, latex_engine, source, reason
    )
    select d.user_id, d.id, d.row_version, d.name, d.content_format, d.latex_engine,
      coalesce(d.content, ''), 'overleaf_sync'
    from public.resumes d
    where d.id = v_document_id and d.user_id = v_user_id;
  elsif v_kind = 'resume_version' then
    insert into public.document_source_history (
      user_id, resume_version_id, row_version, title, content_format, latex_engine, source, reason
    )
    select d.user_id, d.id, d.row_version, coalesce(d.title, 'Tailored resume'),
      d.content_format, d.latex_engine, coalesce(d.content, ''), 'overleaf_sync'
    from public.resume_versions d
    where d.id = v_document_id and d.user_id = v_user_id;
  else
    insert into public.document_source_history (
      user_id, cover_letter_id, row_version, title, content_format, latex_engine, source, reason
    )
    select d.user_id, d.id, d.row_version, coalesce(d.title, 'Cover letter'),
      d.content_format, d.latex_engine, coalesce(d.content, ''), 'overleaf_sync'
    from public.cover_letters d
    where d.id = v_document_id and d.user_id = v_user_id;
  end if;

  select coalesce(
    pg_catalog.array_agg(a.storage_path),
    array[]::text[]
  )
    into v_replaced_paths
  from public.latex_document_assets a
  where a.user_id = v_user_id
    and (
      (v_kind = 'master_resume' and a.resume_id = v_document_id)
      or (v_kind = 'resume_version' and a.resume_version_id = v_document_id)
      or (v_kind = 'cover_letter' and a.cover_letter_id = v_document_id)
    )
    and not exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_assets) item
      where item ->> 'storagePath' = a.storage_path
    );

  delete from public.latex_document_assets a
  where a.user_id = v_user_id
    and (
      (v_kind = 'master_resume' and a.resume_id = v_document_id)
      or (v_kind = 'resume_version' and a.resume_version_id = v_document_id)
      or (v_kind = 'cover_letter' and a.cover_letter_id = v_document_id)
    );

  insert into private.latex_storage_cleanup_queue (user_id, storage_path)
  select v_user_id, queued_path.storage_path
  from pg_catalog.unnest(v_replaced_paths) as queued_path(storage_path)
  on conflict (user_id, storage_path) do nothing;

  select coalesce(pg_catalog.array_agg(q.id), array[]::uuid[])
    into v_cleanup_ids
  from private.latex_storage_cleanup_queue q
  where q.user_id = v_user_id
    and q.storage_path = any(v_replaced_paths);

  insert into public.latex_document_assets (
    user_id,
    resume_id,
    resume_version_id,
    cover_letter_id,
    file_name,
    storage_path,
    content_type,
    size_bytes,
    content_hash
  )
  select
    v_user_id,
    case when v_kind = 'master_resume' then v_document_id end,
    case when v_kind = 'resume_version' then v_document_id end,
    case when v_kind = 'cover_letter' then v_document_id end,
    item ->> 'fileName',
    item ->> 'storagePath',
    item ->> 'contentType',
    (item ->> 'sizeBytes')::bigint,
    item ->> 'contentHash'
  from pg_catalog.jsonb_array_elements(p_assets) item;

  if v_kind = 'master_resume' then
    update public.resumes
    set content = p_source,
        row_version = row_version + 1
    where id = v_document_id and user_id = v_user_id
    returning row_version into v_next_version;
  elsif v_kind = 'resume_version' then
    update public.resume_versions
    set content = p_source,
        row_version = row_version + 1
    where id = v_document_id and user_id = v_user_id and submitted_at is null
    returning row_version into v_next_version;
  else
    update public.cover_letters
    set content = p_source,
        row_version = row_version + 1
    where id = v_document_id and user_id = v_user_id and submitted_at is null
    returning row_version into v_next_version;
  end if;

  if v_next_version is null then
    raise exception 'The document changed during synchronization.' using errcode = '40001';
  end if;

  if v_cursor_id is null then
    insert into private.latex_overleaf_sync_cursors (
      user_id,
      resume_id,
      resume_version_id,
      cover_letter_id,
      overleaf_project_id,
      manifest_version,
      origin_row_version,
      last_synced_row_version
    )
    values (
      v_user_id,
      case when v_kind = 'master_resume' then v_document_id end,
      case when v_kind = 'resume_version' then v_document_id end,
      case when v_kind = 'cover_letter' then v_document_id end,
      p_overleaf_project_id,
      v_manifest_version,
      v_origin_row_version,
      v_next_version
    );
  else
    update private.latex_overleaf_sync_cursors
    set last_synced_row_version = v_next_version
    where id = v_cursor_id and user_id = v_user_id;
  end if;

  return pg_catalog.jsonb_build_object(
    'rowVersion', v_next_version,
    'replacedPaths', pg_catalog.to_jsonb(v_replaced_paths),
    'cleanupIds', pg_catalog.to_jsonb(v_cleanup_ids),
    'unchanged', false
  );
end;
$$;

revoke all on function public.sync_latex_document_from_overleaf(
  uuid, text, text, jsonb, uuid
) from public, anon;
grant execute on function public.sync_latex_document_from_overleaf(
  uuid, text, text, jsonb, uuid
) to authenticated;

comment on table private.latex_overleaf_sync_links is
  'Stores opaque, user-scoped document bindings embedded in exported Overleaf projects.';
comment on table private.latex_storage_cleanup_queue is
  'Durably records unreferenced LaTeX Storage paths until authenticated cleanup succeeds.';
comment on table private.latex_overleaf_sync_cursors is
  'Tracks the last JobMaxxing row version written by each imported Overleaf project.';
comment on function public.issue_latex_overleaf_sync_link(
  text, uuid, bigint
) is
  'Issues an opaque link for the authenticated user, LaTeX document, and current row version.';
comment on function public.enqueue_latex_storage_cleanup(
  text[]
) is
  'Queues authenticated user-owned LaTeX Storage paths for idempotent cleanup.';
comment on function public.pending_latex_storage_cleanup(
  integer
) is
  'Returns a bounded batch of the authenticated user cleanup queue.';
comment on function public.acknowledge_latex_storage_cleanup(
  uuid[]
) is
  'Removes successfully processed entries from the authenticated user cleanup queue.';
comment on function public.preflight_latex_document_from_overleaf(
  uuid, text, text, jsonb
) is
  'Checks editability, optimistic concurrency, and whether a project changed before files are uploaded.';
comment on function public.sync_latex_document_from_overleaf(
  uuid, text, text, jsonb, uuid
) is
  'Atomically replaces editable LaTeX source and project-file metadata with optimistic conflict checks.';
