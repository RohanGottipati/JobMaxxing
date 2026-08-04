begin;

create function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'Assertion failed: %', message;
  end if;
end;
$$;

select pg_temp.assert_true(
  (select relrowsecurity from pg_class where oid = 'public.profile_bullets'::regclass),
  'profile_bullets must have RLS enabled'
);
select pg_temp.assert_true(
  (select relrowsecurity from pg_class where oid = 'public.resume_imports'::regclass),
  'resume_imports must have RLS enabled'
);
select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.profile_bullets', 'select'),
  'anonymous users must not read profile bullets'
);
select pg_temp.assert_true(
  has_table_privilege('authenticated', 'public.profile_bullets', 'select'),
  'authenticated users need Data API privileges for profile bullets'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated',
    'phase-one-a@example.test', '', now(), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Phase One A"}', now(), now()
  ),
  (
    '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated',
    'phase-one-b@example.test', '', now(), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Phase One B"}', now(), now()
  );

select pg_temp.assert_true(
  (select onboarding_status = 'not_started' from public.profiles where id = '11111111-1111-4111-8111-111111111111'),
  'new users must start onboarding without affecting existing-user backfill behavior'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

do $test$
declare
  new_revision bigint;
  payload jsonb := $json$
  {
    "full_name":"Phase One A",
    "headline":"Platform Engineer",
    "phone":"+1 555 0100",
    "location":"Toronto, ON",
    "summary":"Builds reliable career platforms.",
    "additional_info":"Available in four weeks.",
    "career_stage":"mid_career",
    "preferences":{
      "target_roles":["Platform Engineer"],
      "preferred_locations":["Toronto"],
      "work_arrangements":["hybrid"],
      "salary_min":150000,
      "salary_currency":"CAD",
      "work_authorization_status":"Canadian citizen",
      "requires_sponsorship":false
    },
    "links":[{
      "id":"11111111-1111-4111-8111-111111111101",
      "kind":"github","label":"GitHub","url":"https://github.com/example","position":0
    }],
    "experiences":[{
      "id":"11111111-1111-4111-8111-111111111102",
      "kind":"work","job_title":"Platform Engineer","company":"Example Co",
      "location":"Toronto","start_date":"2024-01","end_date":"","is_current":true,
      "original_text":"Built a reliable service.","approved_text":"Built a reliable service.",
      "technologies":["PostgreSQL"],"demonstrated_skills":["Reliability"],"metrics":[],
      "source_kind":"manual","verification_status":"user_confirmed","confidence":1,
      "is_locked":true,"position":0
    }],
    "education":[],
    "projects":[],
    "skills":[{
      "id":"11111111-1111-4111-8111-111111111104","name":"PostgreSQL","position":0
    }],
    "achievements":[],
    "certifications":[],
    "publications":[],
    "languages":[],
    "bullets":[{
      "id":"11111111-1111-4111-8111-111111111103",
      "experience_id":"11111111-1111-4111-8111-111111111102","project_id":null,
      "original_text":"Improved service reliability.","approved_text":"Improved service reliability.",
      "technologies":["PostgreSQL"],"demonstrated_skills":["Reliability"],"metrics":[],
      "source_kind":"manual","verification_status":"user_confirmed","confidence":1,
      "is_locked":true,"position":0
    }]
  }
  $json$::jsonb;
begin
  new_revision := public.save_career_profile(payload, 0);
  if new_revision <> 1 then
    raise exception 'Expected profile revision 1, got %', new_revision;
  end if;

  begin
    perform public.save_career_profile(payload, 0);
    raise exception 'Expected optimistic concurrency failure';
  exception
    when serialization_failure then null;
  end;
end;
$test$;

select pg_temp.assert_true(
  (select count(*) = 1 from public.profile_bullets where user_id = '11111111-1111-4111-8111-111111111111'),
  'atomic profile save must persist bullet evidence'
);
select pg_temp.assert_true(
  (select is_locked and verification_status = 'user_confirmed' from public.profile_bullets where id = '11111111-1111-4111-8111-111111111103'),
  'bullet lock and verification metadata must persist'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.career_profile_revisions where user_id = '11111111-1111-4111-8111-111111111111' and revision = 1),
  'profile saves must create an audit revision'
);

insert into public.resume_imports (
  id, user_id, source_kind, status, source_text
)
values (
  '11111111-1111-4111-8111-111111111210',
  '11111111-1111-4111-8111-111111111111',
  'paste', 'uploaded', 'Phase One imported resume text'
);

select pg_temp.assert_true(
  public.claim_resume_import('11111111-1111-4111-8111-111111111210', false) = false,
  'a newly uploaded import must be claimed without reporting recovery'
);

do $test$
begin
  begin
    perform public.claim_resume_import('11111111-1111-4111-8111-111111111210', false);
    raise exception 'Expected a recent processing claim to be rejected';
  exception
    when sqlstate '55000' then null;
  end;
end;
$test$;

update public.resume_imports
set processing_started_at = now() - interval '11 minutes'
where id = '11111111-1111-4111-8111-111111111210';

select pg_temp.assert_true(
  public.claim_resume_import('11111111-1111-4111-8111-111111111210', true) = true,
  'a stale import claim must be recovered atomically'
);
select pg_temp.assert_true(
  (
    select status = 'extracting' and ai_requested and processing_started_at > now() - interval '1 minute'
    from public.resume_imports
    where id = '11111111-1111-4111-8111-111111111210'
  ),
  'a recovered import must receive a fresh processing lease and requested AI mode'
);

update public.resume_imports
set status = 'review_required', parsed_payload = '{}'::jsonb,
  processing_finished_at = now()
where id = '11111111-1111-4111-8111-111111111210';

select pg_temp.assert_true(
  (
    public.commit_resume_import(
      '11111111-1111-4111-8111-111111111210',
      (select snapshot from public.career_profile_revisions
        where user_id = '11111111-1111-4111-8111-111111111111' and revision = 1),
      1,
      'Imported onboarding resume',
      'technical-classic',
      '{"schemaVersion":1,"sections":[]}'::jsonb,
      true
    ) ->> 'resume_id'
  ) is not null,
  'a reviewed import must commit its canonical profile and structured resume atomically'
);
select pg_temp.assert_true(
  (
    select onboarding_status = 'in_progress' and onboarding_step = 3
    from public.profiles
    where id = '11111111-1111-4111-8111-111111111111'
  ),
  'an onboarding import must resume onboarding at the target-role step'
);
select pg_temp.assert_true(
  (
    select status = 'committed' and committed_resume_id is not null
    from public.resume_imports
    where id = '11111111-1111-4111-8111-111111111210'
  ),
  'a committed import must retain its structured resume relationship'
);

insert into public.resumes (
  id, user_id, name, editor_mode, document_schema_version,
  structured_content, template_id, row_version
)
values (
  '11111111-1111-4111-8111-111111111201',
  '11111111-1111-4111-8111-111111111111',
  'Base resume', 'structured', 1, '{"schemaVersion":1}', 'technical-classic', 0
);

select pg_temp.assert_true(
  public.save_structured_resume_document(
    'master', '11111111-1111-4111-8111-111111111201', 0,
    'Updated base resume', 'minimal-modern', '{"schemaVersion":1,"sections":[]}'
  ) = 1,
  'structured resume saves must advance the row version'
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.resume_document_history
    where resume_id = '11111111-1111-4111-8111-111111111201' and reason = 'autosave'
  ),
  'the first structured save must create a recoverable autosave checkpoint'
);

select pg_temp.assert_true(
  public.save_structured_resume_document(
    'master', '11111111-1111-4111-8111-111111111201', 1,
    'Updated base resume again', 'minimal-modern', '{"schemaVersion":1,"sections":[]}'
  ) = 2,
  'a second structured save must continue advancing the row version'
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.resume_document_history
    where resume_id = '11111111-1111-4111-8111-111111111201' and reason = 'autosave'
  ),
  'automatic checkpoints must be throttled to one per five-minute window'
);

select pg_temp.assert_true(
  public.checkpoint_structured_resume_document(
    'master', '11111111-1111-4111-8111-111111111201', 2,
    '{"schemaVersion":1,"resolved":true}', 'database test'
  ) is not null,
  'structured resume checkpoints must persist'
);

insert into public.applications (
  id, user_id, company_name, role_title
)
values (
  '11111111-1111-4111-8111-111111111202',
  '11111111-1111-4111-8111-111111111111',
  'Example Co', 'Platform Engineer'
);

insert into public.resume_versions (
  id, user_id, application_id, base_resume_id, title,
  editor_mode, document_schema_version, structured_content, template_id
)
values (
  '11111111-1111-4111-8111-111111111203',
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111202',
  '11111111-1111-4111-8111-111111111201',
  'Application resume', 'structured', 1, '{"schemaVersion":1}', 'technical-classic'
);

update public.resume_versions
set submitted_at = now(), is_submitted = true
where id = '11111111-1111-4111-8111-111111111203';

do $test$
begin
  begin
    update public.resume_versions
    set title = 'Mutation after submission'
    where id = '11111111-1111-4111-8111-111111111203';
    raise exception 'Expected submitted resume lock failure';
  exception
    when check_violation then null;
  end;
end;
$test$;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);

select pg_temp.assert_true(
  (select count(*) = 0 from public.profile_links where id = '11111111-1111-4111-8111-111111111101'),
  'RLS must hide another user''s canonical profile data'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.resumes where id = '11111111-1111-4111-8111-111111111201'),
  'RLS must hide another user''s resume'
);

do $test$
begin
  begin
    perform public.claim_resume_import('11111111-1111-4111-8111-111111111210', false);
    raise exception 'Expected another user''s import to be unavailable';
  exception
    when no_data_found then null;
  end;
end;
$test$;

do $test$
declare
  affected integer;
begin
  update public.resumes
  set name = 'Unauthorized mutation'
  where id = '11111111-1111-4111-8111-111111111201';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Another user updated a protected resume';
  end if;

  begin
    perform public.save_structured_resume_document(
      'master', '11111111-1111-4111-8111-111111111201', 1,
      'Unauthorized mutation', 'minimal-modern', '{"schemaVersion":1}'
    );
    raise exception 'Expected cross-user structured save failure';
  exception
    when serialization_failure then null;
  end;
end;
$test$;

rollback;
