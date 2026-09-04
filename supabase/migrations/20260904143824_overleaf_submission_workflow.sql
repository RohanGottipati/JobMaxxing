-- Overleaf compiles outside JobMaxxing, so its exported attachment is the
-- authoritative final file. Legacy locally compiled PDFs remain valid.
create or replace function public.require_fresh_latex_compile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.submitted_at is null
    and new.submitted_at is not null
    and new.content_format = 'latex'
    and new.file_path is null
    and (
      new.compiled_pdf_path is null
      or new.compiled_row_version is distinct from new.row_version
    )
  then
    raise exception 'Attach the final PDF exported from Overleaf before submitting this document.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

comment on function public.require_fresh_latex_compile() is
  'Requires a final Overleaf attachment or a fresh legacy local compile before a LaTeX document is submitted.';
