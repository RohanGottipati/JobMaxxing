-- Remove the retired LaTeX/Overleaf workspace and all of its database surface.
-- Historical migrations remain immutable; this migration is the forward cleanup.

do $$
declare
  fn record;
begin
  for fn in
    select n.nspname as schema_name, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where lower(p.proname) like '%latex%' or lower(p.proname) like '%overleaf%'
  loop
    execute format('drop function if exists %I.%I(%s) cascade', fn.schema_name, fn.proname, fn.args);
  end loop;
end $$;

do $$
declare
  t record;
begin
  for t in
    select event_object_schema, event_object_table, trigger_name
    from information_schema.triggers
    where lower(trigger_name) like '%latex%' or lower(trigger_name) like '%overleaf%'
  loop
    execute format('drop trigger if exists %I on %I.%I', t.trigger_name, t.event_object_schema, t.event_object_table);
  end loop;
end $$;

drop table if exists private.latex_overleaf_sync_links cascade;
drop table if exists private.latex_overleaf_sync_cursors cascade;
drop table if exists private.latex_storage_cleanup_queue cascade;
drop table if exists public.latex_document_assets cascade;

drop trigger if exists resume_versions_require_fresh_latex_compile on public.resume_versions;
drop trigger if exists cover_letters_require_fresh_latex_compile on public.cover_letters;

update public.resumes set content_format = 'plain_text' where content_format = 'latex';
update public.resume_versions set content_format = 'plain_text' where content_format = 'latex';
update public.cover_letters set content_format = 'plain_text' where content_format = 'latex';
update public.document_source_history set content_format = 'plain_text' where content_format = 'latex';

alter table public.resumes drop column if exists latex_engine;
alter table public.resumes drop column if exists compiled_pdf_path;
alter table public.resumes drop column if exists compiled_row_version;
alter table public.resumes drop column if exists compiled_at;
alter table public.resume_versions drop column if exists latex_engine;
alter table public.resume_versions drop column if exists compiled_pdf_path;
alter table public.resume_versions drop column if exists compiled_row_version;
alter table public.resume_versions drop column if exists compiled_at;
alter table public.cover_letters drop column if exists latex_engine;
alter table public.cover_letters drop column if exists compiled_pdf_path;
alter table public.cover_letters drop column if exists compiled_row_version;
alter table public.cover_letters drop column if exists compiled_at;

do $$
declare
  c record;
begin
  for c in
    select n.nspname as schema_name, cl.relname as table_name, con.conname
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
    where lower(pg_get_constraintdef(con.oid)) like '%latex%'
  loop
    execute format('alter table %I.%I drop constraint if exists %I', c.schema_name, c.table_name, c.conname);
  end loop;
end $$;

alter table public.resumes
  add constraint resumes_content_format_check check (content_format in ('plain_text', 'markdown'));
alter table public.resume_versions
  add constraint resume_versions_content_format_check check (content_format in ('plain_text', 'markdown'));
alter table public.cover_letters
  add constraint cover_letters_content_format_check check (content_format in ('plain_text', 'markdown'));
alter table public.document_source_history
  add constraint document_source_history_content_format_check check (content_format in ('plain_text', 'markdown'));

do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (lower(policyname) like '%latex%' or lower(coalesce(qual, '')) like '%latex%' or lower(coalesce(with_check, '')) like '%latex%')
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

-- Supabase protects storage tables from direct SQL deletion. The bucket's
-- policies are removed above; existing objects must be deleted through the
-- Storage API before the bucket itself can be removed.
