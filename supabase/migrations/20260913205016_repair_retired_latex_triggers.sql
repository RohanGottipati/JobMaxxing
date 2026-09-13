-- The LaTeX/Overleaf removal migration dropped compilation columns after the
-- submitted-document lock functions had been expanded to reference them.
-- Recreate the trigger functions against the retained document schema so
-- ordinary resume and cover-letter updates do not fail during trigger
-- evaluation.

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
    )
  then
    raise exception 'Cover letter % was submitted and is locked. Duplicate it before editing.', old.id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
