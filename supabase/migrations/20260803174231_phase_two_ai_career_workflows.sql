-- Phase 2: explainable resume analysis, job intelligence, evidence-backed
-- tailoring, and immutable AI usage/audit records. All user data remains
-- private through RLS and composite ownership foreign keys.

create unique index if not exists applications_id_user_id_uidx
  on public.applications (id, user_id);
create unique index if not exists resumes_id_user_id_uidx
  on public.resumes (id, user_id);
create unique index if not exists resume_versions_id_user_id_uidx
  on public.resume_versions (id, user_id);
create unique index if not exists resume_versions_id_user_application_uidx
  on public.resume_versions (id, user_id, application_id);
create unique index if not exists profile_bullets_id_user_id_uidx
  on public.profile_bullets (id, user_id);

create table private.ai_action_limits (
  action text primary key,
  daily_limit integer not null check (daily_limit > 0),
  updated_at timestamptz not null default now()
);

insert into private.ai_action_limits (action, daily_limit)
values
  ('bullet_rewrite', 30),
  ('resume_analysis', 12),
  ('job_parse', 20),
  ('job_match', 30),
  ('resume_tailoring', 10),
  ('cover_letter_generation', 15);

revoke all on private.ai_action_limits from public, anon, authenticated;

create table public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  resource_type text,
  resource_id uuid,
  created_at timestamptz not null default now(),
  constraint ai_usage_events_action_check check (
    action in (
      'bullet_rewrite', 'resume_analysis', 'job_parse', 'job_match',
      'resume_tailoring', 'cover_letter_generation'
    )
  ),
  constraint ai_usage_events_resource_type_check check (
    resource_type is null or resource_type in ('profile_bullet', 'resume', 'resume_version', 'application')
  )
);

create table public.ai_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  outcome text not null,
  resource_type text,
  resource_id uuid,
  model text,
  duration_ms integer,
  error_code text,
  created_at timestamptz not null default now(),
  constraint ai_audit_events_action_check check (
    action in (
      'bullet_rewrite', 'resume_analysis', 'job_parse', 'job_match',
      'resume_tailoring', 'cover_letter_generation'
    )
  ),
  constraint ai_audit_events_outcome_check check (outcome in ('succeeded', 'failed', 'fallback')),
  constraint ai_audit_events_duration_check check (duration_ms is null or duration_ms >= 0),
  constraint ai_audit_events_resource_type_check check (
    resource_type is null or resource_type in ('profile_bullet', 'resume', 'resume_version', 'application')
  )
);

create table public.resume_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid,
  resume_version_id uuid,
  document_row_version bigint not null default 0,
  analysis_kind text not null default 'deterministic',
  overall_score integer not null,
  category_scores jsonb not null default '{}'::jsonb,
  deductions jsonb not null default '[]'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  reviewer_perspectives jsonb not null default '{}'::jsonb,
  model text,
  created_at timestamptz not null default now(),
  constraint resume_analyses_resume_owner_fkey
    foreign key (resume_id, user_id) references public.resumes(id, user_id) on delete cascade,
  constraint resume_analyses_version_owner_fkey
    foreign key (resume_version_id, user_id) references public.resume_versions(id, user_id) on delete cascade,
  constraint resume_analyses_single_resume_check check (
    (resume_id is not null)::integer + (resume_version_id is not null)::integer = 1
  ),
  constraint resume_analyses_version_check check (document_row_version >= 0),
  constraint resume_analyses_kind_check check (analysis_kind in ('deterministic', 'combined')),
  constraint resume_analyses_score_check check (overall_score between 0 and 100),
  constraint resume_analyses_categories_check check (jsonb_typeof(category_scores) = 'object'),
  constraint resume_analyses_deductions_check check (jsonb_typeof(deductions) = 'array'),
  constraint resume_analyses_strengths_check check (jsonb_typeof(strengths) = 'array'),
  constraint resume_analyses_reviews_check check (jsonb_typeof(reviewer_perspectives) = 'object')
);

create table public.profile_bullet_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_bullet_id uuid not null,
  resume_id uuid,
  resume_version_id uuid,
  application_id uuid,
  mode text not null,
  original_text text not null,
  suggested_text text not null,
  explanation text not null,
  facts_used jsonb not null default '[]'::jsonb,
  unsupported_claims jsonb not null default '[]'::jsonb,
  skills_added text[] not null default '{}'::text[],
  metrics_added text[] not null default '{}'::text[],
  confidence numeric(4,3) not null,
  status text not null default 'pending',
  model text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint profile_bullet_suggestions_bullet_owner_fkey
    foreign key (profile_bullet_id, user_id) references public.profile_bullets(id, user_id) on delete cascade,
  constraint profile_bullet_suggestions_resume_owner_fkey
    foreign key (resume_id, user_id) references public.resumes(id, user_id) on delete cascade,
  constraint profile_bullet_suggestions_version_owner_fkey
    foreign key (resume_version_id, user_id) references public.resume_versions(id, user_id) on delete cascade,
  constraint profile_bullet_suggestions_application_owner_fkey
    foreign key (application_id, user_id) references public.applications(id, user_id) on delete cascade,
  constraint profile_bullet_suggestions_single_resume_check check (
    (resume_id is not null)::integer + (resume_version_id is not null)::integer = 1
  ),
  constraint profile_bullet_suggestions_mode_check check (
    mode in (
      'clarity', 'concise', 'technical_detail', 'impact', 'leadership',
      'collaboration', 'ownership', 'tailor_to_job', 'action_verbs',
      'remove_repetition', 'one_line', 'accomplishment',
      'technical_recruiter', 'nontechnical_recruiter'
    )
  ),
  constraint profile_bullet_suggestions_facts_check check (jsonb_typeof(facts_used) = 'array'),
  constraint profile_bullet_suggestions_claims_check check (jsonb_typeof(unsupported_claims) = 'array'),
  constraint profile_bullet_suggestions_confidence_check check (confidence between 0 and 1),
  constraint profile_bullet_suggestions_status_check check (status in ('pending', 'accepted', 'rejected'))
);

create table public.job_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null,
  source_text_snapshot text not null,
  structured_data jsonb not null default '{}'::jsonb,
  field_confidence jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  parser text not null default 'deterministic',
  model text,
  status text not null default 'review_required',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  constraint job_analyses_application_owner_fkey
    foreign key (application_id, user_id) references public.applications(id, user_id) on delete cascade,
  constraint job_analyses_application_unique unique (application_id),
  constraint job_analyses_id_user_application_unique unique (id, user_id, application_id),
  constraint job_analyses_data_check check (jsonb_typeof(structured_data) = 'object'),
  constraint job_analyses_confidence_check check (jsonb_typeof(field_confidence) = 'object'),
  constraint job_analyses_warnings_check check (jsonb_typeof(warnings) = 'array'),
  constraint job_analyses_parser_check check (parser in ('deterministic', 'ai', 'hybrid')),
  constraint job_analyses_status_check check (status in ('review_required', 'confirmed'))
);

create table public.job_match_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null,
  job_analysis_id uuid not null,
  resume_id uuid,
  resume_version_id uuid,
  resume_row_version bigint not null default 0,
  profile_revision bigint not null default 0,
  job_analysis_updated_at timestamptz not null,
  overall_score integer not null,
  category_scores jsonb not null default '{}'::jsonb,
  strong_matches jsonb not null default '[]'::jsonb,
  partial_matches jsonb not null default '[]'::jsonb,
  missing_requirements jsonb not null default '[]'::jsonb,
  concerns jsonb not null default '[]'::jsonb,
  evidence_matrix jsonb not null default '[]'::jsonb,
  recommended_changes jsonb not null default '[]'::jsonb,
  apply_reasonable boolean not null default true,
  model text,
  created_at timestamptz not null default now(),
  constraint job_match_analyses_application_owner_fkey
    foreign key (application_id, user_id) references public.applications(id, user_id) on delete cascade,
  constraint job_match_analyses_job_owner_fkey
    foreign key (job_analysis_id, user_id, application_id)
    references public.job_analyses(id, user_id, application_id) on delete cascade,
  constraint job_match_analyses_resume_owner_fkey
    foreign key (resume_id, user_id) references public.resumes(id, user_id) on delete cascade,
  constraint job_match_analyses_version_owner_fkey
    foreign key (resume_version_id, user_id, application_id)
    references public.resume_versions(id, user_id, application_id) on delete cascade,
  constraint job_match_analyses_single_resume_check check (
    (resume_id is not null)::integer + (resume_version_id is not null)::integer = 1
  ),
  constraint job_match_analyses_resume_version_check check (resume_row_version >= 0),
  constraint job_match_analyses_profile_revision_check check (profile_revision >= 0),
  constraint job_match_analyses_score_check check (overall_score between 0 and 100),
  constraint job_match_analyses_categories_check check (jsonb_typeof(category_scores) = 'object'),
  constraint job_match_analyses_strong_check check (jsonb_typeof(strong_matches) = 'array'),
  constraint job_match_analyses_partial_check check (jsonb_typeof(partial_matches) = 'array'),
  constraint job_match_analyses_missing_check check (jsonb_typeof(missing_requirements) = 'array'),
  constraint job_match_analyses_concerns_check check (jsonb_typeof(concerns) = 'array'),
  constraint job_match_analyses_evidence_check check (jsonb_typeof(evidence_matrix) = 'array'),
  constraint job_match_analyses_changes_check check (jsonb_typeof(recommended_changes) = 'array')
);

create unique index job_match_analyses_id_user_app_resume_uidx
  on public.job_match_analyses (id, user_id, application_id, resume_id);

create table public.tailoring_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null,
  source_resume_id uuid not null,
  source_resume_row_version bigint not null default 0,
  job_match_analysis_id uuid not null,
  proposed_document jsonb not null,
  changes jsonb not null default '[]'::jsonb,
  evidence_matrix jsonb not null default '[]'::jsonb,
  accepted_change_ids text[] not null default '{}'::text[],
  output_resume_version_id uuid,
  status text not null default 'draft',
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  applied_at timestamptz,
  constraint tailoring_runs_application_owner_fkey
    foreign key (application_id, user_id) references public.applications(id, user_id) on delete cascade,
  constraint tailoring_runs_source_resume_owner_fkey
    foreign key (source_resume_id, user_id) references public.resumes(id, user_id) on delete cascade,
  constraint tailoring_runs_match_owner_fkey
    foreign key (job_match_analysis_id, user_id, application_id, source_resume_id)
    references public.job_match_analyses(id, user_id, application_id, resume_id) on delete cascade,
  constraint tailoring_runs_output_version_owner_fkey
    foreign key (output_resume_version_id, user_id, application_id)
    references public.resume_versions(id, user_id, application_id)
    on delete set null (output_resume_version_id),
  constraint tailoring_runs_document_check check (jsonb_typeof(proposed_document) = 'object'),
  constraint tailoring_runs_source_version_check check (source_resume_row_version >= 0),
  constraint tailoring_runs_changes_check check (jsonb_typeof(changes) = 'array'),
  constraint tailoring_runs_evidence_check check (jsonb_typeof(evidence_matrix) = 'array'),
  constraint tailoring_runs_status_check check (status in ('draft', 'applied', 'discarded'))
);

create index ai_usage_events_user_action_created_idx
  on public.ai_usage_events (user_id, action, created_at desc);
create index ai_audit_events_user_created_idx
  on public.ai_audit_events (user_id, created_at desc);
create index resume_analyses_resume_created_idx
  on public.resume_analyses (resume_id, created_at desc) where resume_id is not null;
create index resume_analyses_version_created_idx
  on public.resume_analyses (resume_version_id, created_at desc) where resume_version_id is not null;
create index resume_analyses_user_created_idx
  on public.resume_analyses (user_id, created_at desc);
create index profile_bullet_suggestions_bullet_created_idx
  on public.profile_bullet_suggestions (profile_bullet_id, created_at desc);
create index profile_bullet_suggestions_user_status_idx
  on public.profile_bullet_suggestions (user_id, status, created_at desc);
create index profile_bullet_suggestions_resume_idx
  on public.profile_bullet_suggestions (resume_id) where resume_id is not null;
create index profile_bullet_suggestions_version_idx
  on public.profile_bullet_suggestions (resume_version_id) where resume_version_id is not null;
create index profile_bullet_suggestions_application_idx
  on public.profile_bullet_suggestions (application_id) where application_id is not null;
create index job_analyses_user_updated_idx
  on public.job_analyses (user_id, updated_at desc);
create index job_match_analyses_application_created_idx
  on public.job_match_analyses (application_id, created_at desc);
create index job_match_analyses_job_analysis_idx
  on public.job_match_analyses (job_analysis_id);
create index job_match_analyses_resume_idx
  on public.job_match_analyses (resume_id) where resume_id is not null;
create index job_match_analyses_version_idx
  on public.job_match_analyses (resume_version_id) where resume_version_id is not null;
create index tailoring_runs_application_created_idx
  on public.tailoring_runs (application_id, created_at desc);
create index tailoring_runs_source_resume_idx
  on public.tailoring_runs (source_resume_id);
create index tailoring_runs_match_idx
  on public.tailoring_runs (job_match_analysis_id) where job_match_analysis_id is not null;
create index tailoring_runs_output_version_idx
  on public.tailoring_runs (output_resume_version_id) where output_resume_version_id is not null;

create trigger set_job_analyses_updated_at
before update on public.job_analyses
for each row execute function public.set_updated_at();

create trigger set_tailoring_runs_updated_at
before update on public.tailoring_runs
for each row execute function public.set_updated_at();

create or replace function public.claim_ai_usage(
  p_action text,
  p_resource_type text default null,
  p_resource_id uuid default null
)
returns table (remaining integer, limit_value integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_limit integer;
  v_count integer;
  v_reset_at timestamptz;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  select daily_limit into v_limit
  from private.ai_action_limits
  where action = p_action;
  if v_limit is null then
    raise exception using errcode = '22023', message = 'Unsupported AI usage action.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':' || p_action, 0)
  );

  select count(*)::integer, min(created_at) + interval '24 hours'
  into v_count, v_reset_at
  from public.ai_usage_events
  where user_id = v_user_id
    and action = p_action
    and created_at >= now() - interval '24 hours';

  if v_count >= v_limit then
    raise exception using
      errcode = 'P0001',
      message = 'AI_RATE_LIMITED:' || coalesce(v_reset_at, now() + interval '24 hours')::text;
  end if;

  insert into public.ai_usage_events (user_id, action, resource_type, resource_id)
  values (v_user_id, p_action, p_resource_type, p_resource_id);

  remaining := greatest(0, v_limit - v_count - 1);
  limit_value := v_limit;
  reset_at := coalesce(v_reset_at, now() + interval '24 hours');
  return next;
end;
$$;

create or replace function public.confirm_job_analysis(
  p_analysis_id uuid,
  p_structured_data jsonb
)
returns public.job_analyses
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_analysis public.job_analyses%rowtype;
  v_result public.job_analyses%rowtype;
  v_deadline_text text := trim(coalesce(p_structured_data ->> 'applicationDeadline', ''));
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;
  if jsonb_typeof(p_structured_data) <> 'object' then
    raise exception using errcode = '22023', message = 'Structured job data must be an object.';
  end if;

  select *
  into v_analysis
  from public.job_analyses
  where id = p_analysis_id and user_id = v_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Job analysis not found.';
  end if;
  if nullif(trim(p_structured_data ->> 'company'), '') is null
    or nullif(trim(p_structured_data ->> 'roleTitle'), '') is null then
    raise exception using errcode = '22023', message = 'Company and role title are required.';
  end if;

  update public.applications
  set
    company_name = trim(p_structured_data ->> 'company'),
    role_title = trim(p_structured_data ->> 'roleTitle'),
    location = nullif(trim(p_structured_data ->> 'location'), ''),
    deadline = case
      when v_deadline_text = '' then null
      when v_deadline_text ~ '^\d{4}-\d{2}-\d{2}$' then v_deadline_text::date
      else deadline
    end
  where id = v_analysis.application_id and user_id = v_user_id;

  update public.job_analyses
  set
    structured_data = p_structured_data,
    status = 'confirmed',
    confirmed_at = now()
  where id = p_analysis_id and user_id = v_user_id
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.apply_tailoring_run(
  p_run_id uuid,
  p_selected_change_ids text[],
  p_title text,
  p_document jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_run public.tailoring_runs%rowtype;
  v_source_row_version bigint;
  v_job_description text;
  v_rules jsonb;
  v_version_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;
  if nullif(trim(p_title), '') is null or length(trim(p_title)) > 200 then
    raise exception using errcode = '22023', message = 'A resume title of 200 characters or fewer is required.';
  end if;
  if jsonb_typeof(p_document) <> 'object' then
    raise exception using errcode = '22023', message = 'The tailored resume document must be an object.';
  end if;

  select *
  into v_run
  from public.tailoring_runs
  where id = p_run_id and user_id = v_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Tailoring run not found.';
  end if;
  if v_run.status = 'applied' and v_run.output_resume_version_id is not null then
    return v_run.output_resume_version_id;
  end if;
  if v_run.status <> 'draft' then
    raise exception using errcode = '55000', message = 'This tailoring run can no longer be applied.';
  end if;

  select row_version
  into v_source_row_version
  from public.resumes
  where id = v_run.source_resume_id and user_id = v_user_id
  for share;
  if not found then
    raise exception using errcode = 'P0002', message = 'Source resume not found.';
  end if;
  if v_source_row_version <> v_run.source_resume_row_version then
    raise exception using errcode = '40001', message = 'The source resume changed after this tailoring run.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_run.changes) as change(value)
    where change.value ->> 'id' = any(coalesce(p_selected_change_ids, '{}'::text[]))
      and jsonb_typeof(change.value -> 'unsupportedClaims') = 'array'
      and jsonb_array_length(change.value -> 'unsupportedClaims') > 0
  ) then
    raise exception using errcode = '22023', message = 'UNSUPPORTED_CLAIMS:Blocked tailoring change selected.';
  end if;

  select coalesce(jsonb_agg(change.value), '[]'::jsonb)
  into v_rules
  from jsonb_array_elements(v_run.changes) as change(value)
  where change.value ->> 'id' = any(coalesce(p_selected_change_ids, '{}'::text[]));

  select job_description
  into v_job_description
  from public.applications
  where id = v_run.application_id and user_id = v_user_id;

  insert into public.resume_versions (
    user_id, application_id, base_resume_id, title, editor_mode,
    document_schema_version, structured_content, template_id, row_version,
    job_description_snapshot, rules_used, generation_metadata
  )
  values (
    v_user_id, v_run.application_id, v_run.source_resume_id, trim(p_title),
    'structured', 1, p_document, p_document #>> '{presentation,templateId}', 0,
    v_job_description, v_rules,
    jsonb_build_object(
      'generated_by', 'phase_two_tailoring',
      'tailoring_run_id', v_run.id,
      'accepted_change_ids', to_jsonb(coalesce(p_selected_change_ids, '{}'::text[])),
      'unsupported_claims', '[]'::jsonb,
      'evidence_matrix', v_run.evidence_matrix
    )
  )
  returning id into v_version_id;

  update public.tailoring_runs
  set
    status = 'applied',
    accepted_change_ids = coalesce(p_selected_change_ids, '{}'::text[]),
    output_resume_version_id = v_version_id,
    applied_at = now()
  where id = v_run.id and user_id = v_user_id;

  return v_version_id;
end;
$$;

alter table public.ai_usage_events enable row level security;
alter table public.ai_audit_events enable row level security;
alter table public.resume_analyses enable row level security;
alter table public.profile_bullet_suggestions enable row level security;
alter table public.job_analyses enable row level security;
alter table public.job_match_analyses enable row level security;
alter table public.tailoring_runs enable row level security;

create policy "Users can view own AI usage"
  on public.ai_usage_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can record own AI usage"
  on public.ai_usage_events for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can view own AI audit events"
  on public.ai_audit_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can record own AI audit events"
  on public.ai_audit_events for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can view own resume analyses"
  on public.resume_analyses for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create own resume analyses"
  on public.resume_analyses for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can view own bullet suggestions"
  on public.profile_bullet_suggestions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create own bullet suggestions"
  on public.profile_bullet_suggestions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own bullet suggestions"
  on public.profile_bullet_suggestions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can view own job analyses"
  on public.job_analyses for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create own job analyses"
  on public.job_analyses for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own job analyses"
  on public.job_analyses for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can view own job matches"
  on public.job_match_analyses for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create own job matches"
  on public.job_match_analyses for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can view own tailoring runs"
  on public.tailoring_runs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create own tailoring runs"
  on public.tailoring_runs for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own tailoring runs"
  on public.tailoring_runs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select on public.ai_usage_events to authenticated;
grant select, insert on public.ai_audit_events to authenticated;
grant select, insert on public.resume_analyses to authenticated;
grant select, insert, update on public.profile_bullet_suggestions to authenticated;
grant select, insert, update on public.job_analyses to authenticated;
grant select, insert on public.job_match_analyses to authenticated;
grant select, insert, update on public.tailoring_runs to authenticated;

revoke all on function public.claim_ai_usage(text, text, uuid) from public, anon;
revoke all on function public.confirm_job_analysis(uuid, jsonb) from public, anon;
revoke all on function public.apply_tailoring_run(uuid, text[], text, jsonb) from public, anon;
grant execute on function public.claim_ai_usage(text, text, uuid) to authenticated;
grant execute on function public.confirm_job_analysis(uuid, jsonb) to authenticated;
grant execute on function public.apply_tailoring_run(uuid, text[], text, jsonb) to authenticated;
