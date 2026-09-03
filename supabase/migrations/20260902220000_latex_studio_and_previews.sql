-- ---------------------------------------------------------------------------
-- Browser LaTeX Studio and unified document previews
--
-- Adds LaTeX source metadata to every document table, a private workspace
-- bucket for supporting assets and compiled output, optimistic source
-- history, and the RPCs the Studio uses for autosave, checkpoint, restore,
-- asset management, and compiled-PDF registration.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Document columns
-- ---------------------------------------------------------------------------

alter table public.resumes
  add column if not exists latex_engine text,
  add column if not exists compiled_pdf_path text,
  add column if not exists compiled_row_version bigint,
  add column if not exists compiled_at timestamptz;

alter table public.resume_versions
  add column if not exists latex_engine text,
  add column if not exists compiled_pdf_path text,
  add column if not exists compiled_row_version bigint,
  add column if not exists compiled_at timestamptz;

alter table public.cover_letters
  add column if not exists latex_engine text,
  add column if not exists compiled_pdf_path text,
  add column if not exists compiled_row_version bigint,
  add column if not exists compiled_at timestamptz,
  add column if not exists row_version bigint not null default 0;

alter table public.resumes
  add constraint resumes_latex_engine_check
    check (latex_engine is null or latex_engine in ('pdflatex', 'xelatex')),
  add constraint resumes_compiled_row_version_check
    check (compiled_row_version is null or compiled_row_version >= 0),
  add constraint resumes_compiled_pdf_pairing_check
    check (num_nonnulls(compiled_pdf_path, compiled_row_version, compiled_at) in (0, 3));

alter table public.resume_versions
  add constraint resume_versions_latex_engine_check
    check (latex_engine is null or latex_engine in ('pdflatex', 'xelatex')),
  add constraint resume_versions_compiled_row_version_check
    check (compiled_row_version is null or compiled_row_version >= 0),
  add constraint resume_versions_compiled_pdf_pairing_check
    check (num_nonnulls(compiled_pdf_path, compiled_row_version, compiled_at) in (0, 3));

alter table public.cover_letters
  add constraint cover_letters_latex_engine_check
    check (latex_engine is null or latex_engine in ('pdflatex', 'xelatex')),
  add constraint cover_letters_compiled_row_version_check
    check (compiled_row_version is null or compiled_row_version >= 0),
  add constraint cover_letters_compiled_pdf_pairing_check
    check (num_nonnulls(compiled_pdf_path, compiled_row_version, compiled_at) in (0, 3)),
  add constraint cover_letters_row_version_check check (row_version >= 0);

-- Composite ownership key so LaTeX child rows can enforce same-owner links the
-- same way resume children already do.
alter table public.cover_letters
  add constraint cover_letters_id_user_key unique (id, user_id);

-- ---------------------------------------------------------------------------
-- Supporting assets
-- ---------------------------------------------------------------------------

create table public.latex_document_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resume_id uuid,
  resume_version_id uuid,
  cover_letter_id uuid,
  file_name text not null,
  storage_path text not null unique,
  content_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  constraint latex_document_assets_one_parent_check
    check (num_nonnulls(resume_id, resume_version_id, cover_letter_id) = 1),
  constraint latex_document_assets_size_check
    check (size_bytes > 0 and size_bytes <= 5242880),
  constraint latex_document_assets_file_name_shape_check
    check (file_name ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$' and file_name not like '%..%'),
  constraint latex_document_assets_file_name_extension_check
    check (lower(file_name) ~ '\.(png|jpg|jpeg|pdf|ttf|otf|cls|sty|bib|bst)$'),
  constraint latex_document_assets_storage_path_check
    check (storage_path like user_id::text || '/%' and storage_path not like '%..%'),
  constraint latex_document_assets_resume_user_fkey foreign key (resume_id, user_id)
    references public.resumes (id, user_id) on delete cascade,
  constraint latex_document_assets_version_user_fkey foreign key (resume_version_id, user_id)
    references public.resume_versions (id, user_id) on delete cascade,
  constraint latex_document_assets_cover_letter_user_fkey foreign key (cover_letter_id, user_id)
    references public.cover_letters (id, user_id) on delete cascade
);

create unique index latex_document_assets_resume_name_uidx
  on public.latex_document_assets (resume_id, lower(file_name)) where resume_id is not null;
create unique index latex_document_assets_version_name_uidx
  on public.latex_document_assets (resume_version_id, lower(file_name)) where resume_version_id is not null;
create unique index latex_document_assets_cover_letter_name_uidx
  on public.latex_document_assets (cover_letter_id, lower(file_name)) where cover_letter_id is not null;

create index latex_document_assets_resume_created_idx
  on public.latex_document_assets (resume_id, created_at desc) where resume_id is not null;
create index latex_document_assets_version_created_idx
  on public.latex_document_assets (resume_version_id, created_at desc) where resume_version_id is not null;
create index latex_document_assets_cover_letter_created_idx
  on public.latex_document_assets (cover_letter_id, created_at desc) where cover_letter_id is not null;
create index latex_document_assets_user_idx on public.latex_document_assets (user_id);

-- ---------------------------------------------------------------------------
-- Source history
-- ---------------------------------------------------------------------------

create table public.document_source_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resume_id uuid,
  resume_version_id uuid,
  cover_letter_id uuid,
  row_version bigint not null,
  title text not null,
  content_format text not null,
  latex_engine text,
  source text not null,
  reason text not null default 'checkpoint',
  created_at timestamptz not null default now(),
  constraint document_source_history_one_parent_check
    check (num_nonnulls(resume_id, resume_version_id, cover_letter_id) = 1),
  constraint document_source_history_row_version_check check (row_version >= 0),
  constraint document_source_history_content_format_check
    check (content_format in ('plain_text', 'markdown', 'latex')),
  constraint document_source_history_engine_check
    check (latex_engine is null or latex_engine in ('pdflatex', 'xelatex')),
  constraint document_source_history_resume_user_fkey foreign key (resume_id, user_id)
    references public.resumes (id, user_id) on delete cascade,
  constraint document_source_history_version_user_fkey foreign key (resume_version_id, user_id)
    references public.resume_versions (id, user_id) on delete cascade,
  constraint document_source_history_cover_letter_user_fkey foreign key (cover_letter_id, user_id)
    references public.cover_letters (id, user_id) on delete cascade
);

create index document_source_history_resume_created_idx
  on public.document_source_history (resume_id, created_at desc) where resume_id is not null;
create index document_source_history_version_created_idx
  on public.document_source_history (resume_version_id, created_at desc) where resume_version_id is not null;
create index document_source_history_cover_letter_created_idx
  on public.document_source_history (cover_letter_id, created_at desc) where cover_letter_id is not null;
create index document_source_history_user_idx on public.document_source_history (user_id);

-- ---------------------------------------------------------------------------
-- RLS and Data API privileges
-- ---------------------------------------------------------------------------

alter table public.latex_document_assets enable row level security;
alter table public.document_source_history enable row level security;

create policy "Users can view own latex assets"
  on public.latex_document_assets for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own latex assets"
  on public.latex_document_assets for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own latex assets"
  on public.latex_document_assets for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view own document source history"
  on public.document_source_history for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own document source history"
  on public.document_source_history for insert to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on table public.latex_document_assets from anon, authenticated;
revoke all on table public.document_source_history from anon, authenticated;

-- History rows stay append-only; assets are insert/delete only so a stored
-- file can never be silently repointed at another document.
grant select, insert, delete on public.latex_document_assets to authenticated;
grant select, insert on public.document_source_history to authenticated;

-- ---------------------------------------------------------------------------
-- Private LaTeX workspace bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'latex-workspaces',
  'latex-workspaces',
  false,
  5242880,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'font/ttf',
    'font/otf',
    'text/plain',
    'application/x-tex'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read own latex workspace files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'latex-workspaces'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and owner_id = (select auth.uid()::text)
  );

create policy "Users can upload own latex workspace files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'latex-workspaces'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can replace own latex workspace files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'latex-workspaces'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and owner_id = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'latex-workspaces'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can delete own latex workspace files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'latex-workspaces'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and owner_id = (select auth.uid()::text)
    and not exists (
      select 1
      from public.resume_versions as resume_version
      where resume_version.user_id = (select auth.uid())
        and resume_version.compiled_pdf_path = name
        and resume_version.submitted_at is not null
    )
    and not exists (
      select 1
      from public.cover_letters as cover_letter
      where cover_letter.user_id = (select auth.uid())
        and cover_letter.compiled_pdf_path = name
        and cover_letter.submitted_at is not null
    )
    and not exists (
      select 1
      from public.latex_document_assets as asset
      join public.resume_versions as resume_version
        on resume_version.id = asset.resume_version_id
      where asset.user_id = (select auth.uid())
        and asset.storage_path = name
        and resume_version.submitted_at is not null
    )
    and not exists (
      select 1
      from public.latex_document_assets as asset
      join public.cover_letters as cover_letter
        on cover_letter.id = asset.cover_letter_id
      where asset.user_id = (select auth.uid())
        and asset.storage_path = name
        and cover_letter.submitted_at is not null
    )
  );

-- ---------------------------------------------------------------------------
-- Asset quota enforcement
-- ---------------------------------------------------------------------------

create or replace function public.enforce_latex_asset_quota()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
  v_total bigint;
begin
  select pg_catalog.count(*), pg_catalog.coalesce(pg_catalog.sum(size_bytes), 0)
    into v_count, v_total
  from public.latex_document_assets
  where user_id = new.user_id
    and resume_id is not distinct from new.resume_id
    and resume_version_id is not distinct from new.resume_version_id
    and cover_letter_id is not distinct from new.cover_letter_id;

  if v_count >= 20 then
    raise exception 'A LaTeX document can hold at most 20 supporting assets.'
      using errcode = 'check_violation';
  end if;

  if v_total + new.size_bytes > 20971520 then
    raise exception 'Supporting assets for a LaTeX document must total 20 MB or less.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger latex_document_assets_enforce_quota
  before insert on public.latex_document_assets
  for each row execute function public.enforce_latex_asset_quota();

revoke all on function public.enforce_latex_asset_quota() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Optimistic LaTeX source writes
-- ---------------------------------------------------------------------------

create or replace function public.save_latex_document_source(
  p_kind text,
  p_document_id uuid,
  p_expected_version bigint,
  p_title text,
  p_source text,
  p_engine text
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
  if p_kind not in ('master_resume', 'resume_version', 'cover_letter') then
    raise exception 'Invalid LaTeX document kind.' using errcode = '22023';
  end if;
  if p_engine is not null and p_engine not in ('pdflatex', 'xelatex') then
    raise exception 'Invalid LaTeX engine.' using errcode = '22023';
  end if;
  if pg_catalog.length(pg_catalog.coalesce(p_source, '')) > 2000000 then
    raise exception 'LaTeX source must be 2 MB or smaller.' using errcode = '22023';
  end if;

  if p_kind = 'master_resume' then
    update public.resumes
    set name = p_title,
        content = p_source,
        content_format = 'latex',
        latex_engine = pg_catalog.coalesce(p_engine, latex_engine, 'pdflatex'),
        row_version = row_version + 1
    where id = p_document_id
      and user_id = v_user_id
      and row_version = p_expected_version
    returning row_version into v_version;
  elsif p_kind = 'resume_version' then
    update public.resume_versions
    set title = p_title,
        content = p_source,
        content_format = 'latex',
        latex_engine = pg_catalog.coalesce(p_engine, latex_engine, 'pdflatex'),
        row_version = row_version + 1
    where id = p_document_id
      and user_id = v_user_id
      and submitted_at is null
      and row_version = p_expected_version
    returning row_version into v_version;
  else
    update public.cover_letters
    set title = p_title,
        content = p_source,
        content_format = 'latex',
        latex_engine = pg_catalog.coalesce(p_engine, latex_engine, 'pdflatex'),
        row_version = row_version + 1
    where id = p_document_id
      and user_id = v_user_id
      and submitted_at is null
      and row_version = p_expected_version
    returning row_version into v_version;
  end if;

  if v_version is null then
    raise exception 'The document changed in another session or is unavailable.'
      using errcode = '40001';
  end if;

  -- Mirror the structured editor: keep recoverable snapshots without writing a
  -- history row on every debounced save. Continuous editing yields at most one
  -- automatic checkpoint every five minutes.
  if p_kind = 'master_resume' then
    insert into public.document_source_history (
      user_id, resume_id, row_version, title, content_format, latex_engine, source, reason
    )
    select d.user_id, d.id, d.row_version, d.name, d.content_format, d.latex_engine,
      pg_catalog.coalesce(d.content, ''), 'autosave'
    from public.resumes d
    where d.id = p_document_id and d.user_id = v_user_id
      and not exists (
        select 1 from public.document_source_history h
        where h.resume_id = d.id and h.user_id = v_user_id
          and h.created_at > pg_catalog.now() - interval '5 minutes'
      );
  elsif p_kind = 'resume_version' then
    insert into public.document_source_history (
      user_id, resume_version_id, row_version, title, content_format, latex_engine, source, reason
    )
    select d.user_id, d.id, d.row_version, pg_catalog.coalesce(d.title, 'Tailored resume'),
      d.content_format, d.latex_engine, pg_catalog.coalesce(d.content, ''), 'autosave'
    from public.resume_versions d
    where d.id = p_document_id and d.user_id = v_user_id
      and not exists (
        select 1 from public.document_source_history h
        where h.resume_version_id = d.id and h.user_id = v_user_id
          and h.created_at > pg_catalog.now() - interval '5 minutes'
      );
  else
    insert into public.document_source_history (
      user_id, cover_letter_id, row_version, title, content_format, latex_engine, source, reason
    )
    select d.user_id, d.id, d.row_version, pg_catalog.coalesce(d.title, 'Cover letter'),
      d.content_format, d.latex_engine, pg_catalog.coalesce(d.content, ''), 'autosave'
    from public.cover_letters d
    where d.id = p_document_id and d.user_id = v_user_id
      and not exists (
        select 1 from public.document_source_history h
        where h.cover_letter_id = d.id and h.user_id = v_user_id
          and h.created_at > pg_catalog.now() - interval '5 minutes'
      );
  end if;

  return v_version;
end;
$$;

create or replace function public.checkpoint_latex_document_source(
  p_kind text,
  p_document_id uuid,
  p_expected_version bigint,
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

  if p_kind = 'master_resume' then
    insert into public.document_source_history (
      user_id, resume_id, row_version, title, content_format, latex_engine, source, reason
    )
    select d.user_id, d.id, d.row_version, d.name, d.content_format, d.latex_engine,
      pg_catalog.coalesce(d.content, ''), pg_catalog.left(pg_catalog.coalesce(p_reason, 'checkpoint'), 80)
    from public.resumes d
    where d.id = p_document_id and d.user_id = v_user_id and d.row_version = p_expected_version
    returning id into v_history_id;
  elsif p_kind = 'resume_version' then
    insert into public.document_source_history (
      user_id, resume_version_id, row_version, title, content_format, latex_engine, source, reason
    )
    select d.user_id, d.id, d.row_version, pg_catalog.coalesce(d.title, 'Tailored resume'),
      d.content_format, d.latex_engine, pg_catalog.coalesce(d.content, ''),
      pg_catalog.left(pg_catalog.coalesce(p_reason, 'checkpoint'), 80)
    from public.resume_versions d
    where d.id = p_document_id and d.user_id = v_user_id and d.row_version = p_expected_version
    returning id into v_history_id;
  elsif p_kind = 'cover_letter' then
    insert into public.document_source_history (
      user_id, cover_letter_id, row_version, title, content_format, latex_engine, source, reason
    )
    select d.user_id, d.id, d.row_version, pg_catalog.coalesce(d.title, 'Cover letter'),
      d.content_format, d.latex_engine, pg_catalog.coalesce(d.content, ''),
      pg_catalog.left(pg_catalog.coalesce(p_reason, 'checkpoint'), 80)
    from public.cover_letters d
    where d.id = p_document_id and d.user_id = v_user_id and d.row_version = p_expected_version
    returning id into v_history_id;
  else
    raise exception 'Invalid LaTeX document kind.' using errcode = '22023';
  end if;

  if v_history_id is null then
    raise exception 'The document changed before the checkpoint was saved.' using errcode = '40001';
  end if;
  return v_history_id;
end;
$$;

create or replace function public.restore_latex_document_source(
  p_kind text,
  p_document_id uuid,
  p_expected_version bigint,
  p_history_id uuid
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_source text;
  v_title text;
  v_engine text;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select h.source, h.title, h.latex_engine into v_source, v_title, v_engine
  from public.document_source_history h
  where h.id = p_history_id
    and h.user_id = v_user_id
    and (
      (p_kind = 'master_resume' and h.resume_id = p_document_id)
      or (p_kind = 'resume_version' and h.resume_version_id = p_document_id)
      or (p_kind = 'cover_letter' and h.cover_letter_id = p_document_id)
    );

  if v_source is null then
    raise exception 'The requested revision was not found.' using errcode = 'no_data_found';
  end if;

  return public.save_latex_document_source(
    p_kind, p_document_id, p_expected_version, v_title, v_source, v_engine
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Asset attach / remove
-- ---------------------------------------------------------------------------

create or replace function public.attach_latex_document_asset(
  p_kind text,
  p_document_id uuid,
  p_file_name text,
  p_storage_path text,
  p_content_type text,
  p_size_bytes bigint
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

  if p_kind = 'master_resume' then
    insert into public.latex_document_assets (
      user_id, resume_id, file_name, storage_path, content_type, size_bytes
    )
    select v_user_id, d.id, p_file_name, p_storage_path, p_content_type, p_size_bytes
    from public.resumes d where d.id = p_document_id and d.user_id = v_user_id;

    update public.resumes set row_version = row_version + 1
    where id = p_document_id and user_id = v_user_id
    returning row_version into v_version;
  elsif p_kind = 'resume_version' then
    insert into public.latex_document_assets (
      user_id, resume_version_id, file_name, storage_path, content_type, size_bytes
    )
    select v_user_id, d.id, p_file_name, p_storage_path, p_content_type, p_size_bytes
    from public.resume_versions d
    where d.id = p_document_id and d.user_id = v_user_id and d.submitted_at is null;

    update public.resume_versions set row_version = row_version + 1
    where id = p_document_id and user_id = v_user_id and submitted_at is null
    returning row_version into v_version;
  elsif p_kind = 'cover_letter' then
    insert into public.latex_document_assets (
      user_id, cover_letter_id, file_name, storage_path, content_type, size_bytes
    )
    select v_user_id, d.id, p_file_name, p_storage_path, p_content_type, p_size_bytes
    from public.cover_letters d
    where d.id = p_document_id and d.user_id = v_user_id and d.submitted_at is null;

    update public.cover_letters set row_version = row_version + 1
    where id = p_document_id and user_id = v_user_id and submitted_at is null
    returning row_version into v_version;
  else
    raise exception 'Invalid LaTeX document kind.' using errcode = '22023';
  end if;

  if v_version is null then
    raise exception 'The document is locked or unavailable.' using errcode = '40001';
  end if;
  return v_version;
end;
$$;

create or replace function public.remove_latex_document_asset(
  p_kind text,
  p_document_id uuid,
  p_asset_id uuid
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_version bigint;
  v_deleted uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_kind not in ('master_resume', 'resume_version', 'cover_letter') then
    raise exception 'Invalid LaTeX document kind.' using errcode = '22023';
  end if;

  delete from public.latex_document_assets a
  where a.id = p_asset_id
    and a.user_id = v_user_id
    and (
      (p_kind = 'master_resume' and a.resume_id = p_document_id)
      or (p_kind = 'resume_version' and a.resume_version_id = p_document_id)
      or (p_kind = 'cover_letter' and a.cover_letter_id = p_document_id)
    )
  returning a.id into v_deleted;

  if v_deleted is null then
    raise exception 'The requested asset was not found.' using errcode = 'no_data_found';
  end if;

  if p_kind = 'master_resume' then
    update public.resumes set row_version = row_version + 1
    where id = p_document_id and user_id = v_user_id
    returning row_version into v_version;
  elsif p_kind = 'resume_version' then
    update public.resume_versions set row_version = row_version + 1
    where id = p_document_id and user_id = v_user_id and submitted_at is null
    returning row_version into v_version;
  else
    update public.cover_letters set row_version = row_version + 1
    where id = p_document_id and user_id = v_user_id and submitted_at is null
    returning row_version into v_version;
  end if;

  if v_version is null then
    raise exception 'The document is locked or unavailable.' using errcode = '40001';
  end if;
  return v_version;
end;
$$;

-- ---------------------------------------------------------------------------
-- Compiled PDF registration
-- ---------------------------------------------------------------------------

create or replace function public.register_latex_compiled_pdf(
  p_kind text,
  p_document_id uuid,
  p_source_version bigint,
  p_storage_path text
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
  if p_storage_path is null or p_storage_path not like v_user_id::text || '/%' then
    raise exception 'Invalid compiled output path.' using errcode = '22023';
  end if;

  if p_kind = 'master_resume' then
    update public.resumes
    set compiled_pdf_path = p_storage_path,
        compiled_row_version = p_source_version,
        compiled_at = pg_catalog.now()
    where id = p_document_id and user_id = v_user_id and row_version = p_source_version
    returning row_version into v_version;
  elsif p_kind = 'resume_version' then
    update public.resume_versions
    set compiled_pdf_path = p_storage_path,
        compiled_row_version = p_source_version,
        compiled_at = pg_catalog.now()
    where id = p_document_id and user_id = v_user_id
      and submitted_at is null and row_version = p_source_version
    returning row_version into v_version;
  elsif p_kind = 'cover_letter' then
    update public.cover_letters
    set compiled_pdf_path = p_storage_path,
        compiled_row_version = p_source_version,
        compiled_at = pg_catalog.now()
    where id = p_document_id and user_id = v_user_id
      and submitted_at is null and row_version = p_source_version
    returning row_version into v_version;
  else
    raise exception 'Invalid LaTeX document kind.' using errcode = '22023';
  end if;

  if v_version is null then
    raise exception 'The source changed after this PDF was compiled.' using errcode = '40001';
  end if;
  return v_version;
end;
$$;

revoke all on function public.save_latex_document_source(text, uuid, bigint, text, text, text)
  from public, anon;
grant execute on function public.save_latex_document_source(text, uuid, bigint, text, text, text)
  to authenticated;
revoke all on function public.checkpoint_latex_document_source(text, uuid, bigint, text)
  from public, anon;
grant execute on function public.checkpoint_latex_document_source(text, uuid, bigint, text)
  to authenticated;
revoke all on function public.restore_latex_document_source(text, uuid, bigint, uuid)
  from public, anon;
grant execute on function public.restore_latex_document_source(text, uuid, bigint, uuid)
  to authenticated;
revoke all on function public.attach_latex_document_asset(text, uuid, text, text, text, bigint)
  from public, anon;
grant execute on function public.attach_latex_document_asset(text, uuid, text, text, text, bigint)
  to authenticated;
revoke all on function public.remove_latex_document_asset(text, uuid, uuid) from public, anon;
grant execute on function public.remove_latex_document_asset(text, uuid, uuid) to authenticated;
revoke all on function public.register_latex_compiled_pdf(text, uuid, bigint, text) from public, anon;
grant execute on function public.register_latex_compiled_pdf(text, uuid, bigint, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Submitted documents stay immutable, including LaTeX source and output
-- ---------------------------------------------------------------------------

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
      or new.content_format is distinct from old.content_format
      or new.generation_metadata is distinct from old.generation_metadata
      or new.latex_engine is distinct from old.latex_engine
      or new.compiled_pdf_path is distinct from old.compiled_pdf_path
      or new.compiled_row_version is distinct from old.compiled_row_version
      or new.compiled_at is distinct from old.compiled_at
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
      or new.row_version is distinct from old.row_version
      or new.content_format is distinct from old.content_format
      or new.generation_metadata is distinct from old.generation_metadata
      or new.latex_engine is distinct from old.latex_engine
      or new.compiled_pdf_path is distinct from old.compiled_pdf_path
      or new.compiled_row_version is distinct from old.compiled_row_version
      or new.compiled_at is distinct from old.compiled_at
    )
  then
    raise exception 'Cover letter % was submitted and is locked. Duplicate it before editing.', old.id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Submitting a LaTeX document requires compiled output that matches the source
-- revision being submitted, so the stored package always has a usable PDF.
create or replace function public.require_fresh_latex_compile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.submitted_at is null
    and new.submitted_at is not null
    and new.content_format = 'latex'
    and (
      new.compiled_pdf_path is null
      or new.compiled_row_version is distinct from new.row_version
    )
  then
    raise exception 'Compile this LaTeX document before submitting it so the package includes a current PDF.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger resume_versions_require_fresh_latex_compile
  before update on public.resume_versions
  for each row execute function public.require_fresh_latex_compile();

create trigger cover_letters_require_fresh_latex_compile
  before update on public.cover_letters
  for each row execute function public.require_fresh_latex_compile();

revoke all on function public.require_fresh_latex_compile() from public, anon, authenticated;
