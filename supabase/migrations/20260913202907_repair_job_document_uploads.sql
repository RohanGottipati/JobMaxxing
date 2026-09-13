-- Reconcile the shared private document bucket and its authenticated upload
-- policy. Web resume imports, web application packages, and the Chrome
-- extension all write new objects below a first-level folder equal to the
-- authenticated user's ID.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'job-documents',
  'job-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own job documents" on storage.objects;

create policy "Users can upload own job documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'job-documents'
    and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  );
