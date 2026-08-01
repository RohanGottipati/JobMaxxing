-- Maxwell workspace assistant
--
-- Persists private assistant conversations and audited tool actions, adds
-- portable source formats to job documents, and provides one short atomic RPC
-- for importing an application package. Every exposed table uses ownership RLS
-- and every grant is opt-in for the authenticated role.

create type public.assistant_message_role as enum (
  'user',
  'assistant',
  'tool'
);

create type public.assistant_action_status as enum (
  'pending',
  'running',
  'succeeded',
  'failed',
  'declined'
);

alter table public.resumes
  add column content_format text not null default 'plain_text',
  add column generation_metadata jsonb not null default '{}'::jsonb,
  add constraint resumes_content_format_check
    check (content_format in ('plain_text', 'markdown', 'latex')),
  add constraint resumes_generation_metadata_object_check
    check (jsonb_typeof(generation_metadata) = 'object');

alter table public.resume_versions
  add column content_format text not null default 'plain_text',
  add column generation_metadata jsonb not null default '{}'::jsonb,
  add constraint resume_versions_content_format_check
    check (content_format in ('plain_text', 'markdown', 'latex')),
  add constraint resume_versions_generation_metadata_object_check
    check (jsonb_typeof(generation_metadata) = 'object');

alter table public.cover_letters
  add column content_format text not null default 'plain_text',
  add column generation_metadata jsonb not null default '{}'::jsonb,
  add constraint cover_letters_content_format_check
    check (content_format in ('plain_text', 'markdown', 'latex')),
  add constraint cover_letters_generation_metadata_object_check
    check (jsonb_typeof(generation_metadata) = 'object');

create table public.assistant_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New conversation',
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assistant_threads_title_length_check
    check (char_length(title) between 1 and 160),
  constraint assistant_threads_id_user_key unique (id, user_id)
);

create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.assistant_message_role not null,
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  client_message_id uuid,
  created_at timestamptz not null default now(),
  constraint assistant_messages_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint assistant_messages_thread_user_fkey
    foreign key (thread_id, user_id)
    references public.assistant_threads (id, user_id) on delete cascade,
  constraint assistant_messages_id_user_thread_key
    unique (id, user_id, thread_id)
);

create table public.assistant_attachments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  message_id uuid,
  user_id uuid not null references auth.users (id) on delete cascade,
  file_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  extracted_text text,
  created_at timestamptz not null default now(),
  constraint assistant_attachments_file_name_length_check
    check (char_length(file_name) between 1 and 255),
  constraint assistant_attachments_mime_type_check
    check (
      mime_type in (
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
    ),
  constraint assistant_attachments_size_check
    check (size_bytes between 1 and 10485760),
  constraint assistant_attachments_thread_user_fkey
    foreign key (thread_id, user_id)
    references public.assistant_threads (id, user_id) on delete cascade,
  constraint assistant_attachments_message_user_thread_fkey
    foreign key (message_id, user_id, thread_id)
    references public.assistant_messages (id, user_id, thread_id)
    on delete set null (message_id)
);

create table public.assistant_actions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  message_id uuid,
  user_id uuid not null references auth.users (id) on delete cascade,
  tool_name text not null,
  arguments jsonb not null default '{}'::jsonb,
  status public.assistant_action_status not null default 'pending',
  requires_confirmation boolean not null default false,
  authorization_evidence text,
  result jsonb,
  error text,
  idempotency_key uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assistant_actions_tool_name_length_check
    check (char_length(tool_name) between 1 and 120),
  constraint assistant_actions_arguments_object_check
    check (jsonb_typeof(arguments) = 'object'),
  constraint assistant_actions_result_object_check
    check (result is null or jsonb_typeof(result) = 'object'),
  constraint assistant_actions_thread_user_fkey
    foreign key (thread_id, user_id)
    references public.assistant_threads (id, user_id) on delete cascade,
  constraint assistant_actions_message_user_thread_fkey
    foreign key (message_id, user_id, thread_id)
    references public.assistant_messages (id, user_id, thread_id)
    on delete set null (message_id),
  constraint assistant_actions_user_idempotency_key
    unique (user_id, idempotency_key)
);

create index assistant_threads_user_updated_idx
  on public.assistant_threads (user_id, updated_at desc);
create index assistant_messages_thread_created_idx
  on public.assistant_messages (thread_id, created_at, id);
create index assistant_messages_user_created_idx
  on public.assistant_messages (user_id, created_at desc);
create unique index assistant_messages_user_client_id_idx
  on public.assistant_messages (user_id, client_message_id)
  where client_message_id is not null;
create index assistant_attachments_thread_created_idx
  on public.assistant_attachments (thread_id, created_at);
create index assistant_attachments_message_id_idx
  on public.assistant_attachments (message_id)
  where message_id is not null;
create index assistant_attachments_user_created_idx
  on public.assistant_attachments (user_id, created_at desc);
create index assistant_actions_thread_created_idx
  on public.assistant_actions (thread_id, created_at, id);
create index assistant_actions_message_id_idx
  on public.assistant_actions (message_id)
  where message_id is not null;
create index assistant_actions_user_status_created_idx
  on public.assistant_actions (user_id, status, created_at desc);

create trigger assistant_threads_updated_at
  before update on public.assistant_threads
  for each row execute function public.set_updated_at();

create trigger assistant_actions_updated_at
  before update on public.assistant_actions
  for each row execute function public.set_updated_at();

alter table public.assistant_threads enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.assistant_attachments enable row level security;
alter table public.assistant_actions enable row level security;

create policy "Users can view own assistant threads"
  on public.assistant_threads for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create own assistant threads"
  on public.assistant_threads for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own assistant threads"
  on public.assistant_threads for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own assistant threads"
  on public.assistant_threads for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view own assistant messages"
  on public.assistant_messages for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create own assistant messages"
  on public.assistant_messages for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own assistant messages"
  on public.assistant_messages for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can view own assistant attachments"
  on public.assistant_attachments for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create own assistant attachments"
  on public.assistant_attachments for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own assistant attachments"
  on public.assistant_attachments for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own assistant attachments"
  on public.assistant_attachments for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view own assistant actions"
  on public.assistant_actions for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create own assistant actions"
  on public.assistant_actions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own assistant actions"
  on public.assistant_actions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.assistant_threads from anon;
revoke all on table public.assistant_messages from anon;
revoke all on table public.assistant_attachments from anon;
revoke all on table public.assistant_actions from anon;

grant select, insert, update, delete
  on table public.assistant_threads to authenticated;
grant select, insert, update
  on table public.assistant_messages to authenticated;
grant select, insert, update, delete
  on table public.assistant_attachments to authenticated;
grant select, insert, update
  on table public.assistant_actions to authenticated;

create or replace function public.create_application_package(p_package jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_company_name text := nullif(btrim(p_package ->> 'company_name'), '');
  v_role_title text := nullif(btrim(p_package ->> 'role_title'), '');
  v_job_url text := nullif(p_package ->> 'job_url', '');
  v_mark_submitted boolean := coalesce((p_package ->> 'mark_submitted')::boolean, false);
  v_allow_duplicate boolean := coalesce((p_package ->> 'allow_duplicate')::boolean, false);
  v_requested_status public.application_status := case
    when nullif(p_package ->> 'status', '') is null then 'saved'::public.application_status
    else (p_package ->> 'status')::public.application_status
  end;
  v_status public.application_status := case
    when v_mark_submitted and v_requested_status = 'saved' then 'applied'
    else v_requested_status
  end;
  v_position integer;
  v_application_id uuid;
  v_resume_id uuid;
  v_cover_letter_id uuid;
  v_existing_application_id uuid;
  v_base_resume_id uuid := nullif(p_package #>> '{resume,base_resume_id}', '')::uuid;
  v_resume_file_path text := nullif(p_package #>> '{resume,file_path}', '');
  v_cover_file_path text := nullif(p_package #>> '{cover_letter,file_path}', '');
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if v_company_name is null or v_role_title is null then
    raise exception 'Company name and role title are required.' using errcode = '22023';
  end if;

  -- Keep duplicate detection and board positioning in the same short critical
  -- section. Package creation performs no network work inside this transaction.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  if not v_allow_duplicate then
    select id
      into v_existing_application_id
      from public.applications
      where user_id = v_user_id
        and (
          (v_job_url is not null and job_url = v_job_url)
          or (
            lower(btrim(company_name)) = lower(v_company_name)
            and lower(btrim(role_title)) = lower(v_role_title)
          )
        )
      order by created_at desc
      limit 1;

    if v_existing_application_id is not null then
      return jsonb_build_object(
        'duplicate_found', true,
        'existing_application_id', v_existing_application_id
      );
    end if;
  end if;

  if v_base_resume_id is not null and not exists (
    select 1
    from public.resumes
    where id = v_base_resume_id
      and user_id = v_user_id
  ) then
    raise exception 'The selected master resume was not found.' using errcode = 'P0002';
  end if;

  if v_resume_file_path is not null
    and v_resume_file_path not like v_user_id::text || '/%'
  then
    raise exception 'Invalid resume file path.' using errcode = '22023';
  end if;

  if v_cover_file_path is not null
    and v_cover_file_path not like v_user_id::text || '/%'
  then
    raise exception 'Invalid cover-letter file path.' using errcode = '22023';
  end if;

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
    position
  )
  values (
    v_user_id,
    v_company_name,
    v_role_title,
    v_job_url,
    nullif(p_package ->> 'job_description', ''),
    nullif(p_package ->> 'location', ''),
    v_status,
    nullif(p_package ->> 'deadline', '')::date,
    nullif(p_package ->> 'date_applied', '')::date,
    nullif(p_package ->> 'notes', ''),
    nullif(p_package ->> 'referral_contact', ''),
    nullif(p_package ->> 'next_action', ''),
    v_position
  )
  returning id into v_application_id;

  if jsonb_typeof(p_package -> 'resume') = 'object' then
    insert into public.resume_versions (
      user_id,
      application_id,
      base_resume_id,
      title,
      content,
      file_path,
      rules_used,
      job_description_snapshot,
      content_format,
      generation_metadata,
      is_submitted,
      submitted_at
    )
    values (
      v_user_id,
      v_application_id,
      v_base_resume_id,
      coalesce(
        nullif(p_package #>> '{resume,title}', ''),
        v_company_name || ' — ' || v_role_title || ' Resume'
      ),
      nullif(p_package #>> '{resume,content}', ''),
      v_resume_file_path,
      p_package #> '{resume,rules_used}',
      nullif(p_package ->> 'job_description', ''),
      coalesce(nullif(p_package #>> '{resume,content_format}', ''), 'plain_text'),
      coalesce(p_package #> '{resume,generation_metadata}', '{}'::jsonb),
      v_mark_submitted,
      case when v_mark_submitted then now() else null end
    )
    returning id into v_resume_id;
  end if;

  if jsonb_typeof(p_package -> 'cover_letter') = 'object' then
    insert into public.cover_letters (
      user_id,
      application_id,
      title,
      content,
      file_path,
      template_used,
      job_description_snapshot,
      content_format,
      generation_metadata,
      is_submitted,
      submitted_at
    )
    values (
      v_user_id,
      v_application_id,
      coalesce(
        nullif(p_package #>> '{cover_letter,title}', ''),
        v_company_name || ' — ' || v_role_title || ' Cover Letter'
      ),
      nullif(p_package #>> '{cover_letter,content}', ''),
      v_cover_file_path,
      nullif(p_package #>> '{cover_letter,template_used}', ''),
      nullif(p_package ->> 'job_description', ''),
      coalesce(nullif(p_package #>> '{cover_letter,content_format}', ''), 'plain_text'),
      coalesce(p_package #> '{cover_letter,generation_metadata}', '{}'::jsonb),
      v_mark_submitted,
      case when v_mark_submitted then now() else null end
    )
    returning id into v_cover_letter_id;
  end if;

  if v_mark_submitted then
    update public.applications
    set
      submitted_resume_version_id = v_resume_id,
      submitted_cover_letter_id = v_cover_letter_id
    where id = v_application_id
      and user_id = v_user_id;
  end if;

  return jsonb_build_object(
    'application_id', v_application_id,
    'resume_version_id', v_resume_id,
    'cover_letter_id', v_cover_letter_id,
    'submitted', v_mark_submitted
  );
end;
$$;

revoke all on function public.create_application_package(jsonb) from public;
revoke all on function public.create_application_package(jsonb) from anon;
grant execute on function public.create_application_package(jsonb) to authenticated;

-- Referenced draft files are workspace documents too. Prevent direct Storage
-- deletion until the owning document or assistant attachment row is removed.
drop policy if exists "Users can delete own job documents" on storage.objects;
create policy "Users can delete own job documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'job-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and owner_id = (select auth.uid()::text)
    and not exists (
      select 1 from public.resumes
      where resumes.user_id = (select auth.uid())
        and resumes.file_path = name
    )
    and not exists (
      select 1 from public.resume_versions
      where resume_versions.user_id = (select auth.uid())
        and resume_versions.file_path = name
    )
    and not exists (
      select 1 from public.cover_letters
      where cover_letters.user_id = (select auth.uid())
        and cover_letters.file_path = name
    )
    and not exists (
      select 1 from public.assistant_attachments
      where assistant_attachments.user_id = (select auth.uid())
        and assistant_attachments.file_path = name
    )
  );
