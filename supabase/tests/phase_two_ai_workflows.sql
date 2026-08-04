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
  (select bool_and(relrowsecurity)
   from pg_class
   where oid = any(array[
     'public.ai_usage_events'::regclass,
     'public.ai_audit_events'::regclass,
     'public.resume_analyses'::regclass,
     'public.profile_bullet_suggestions'::regclass,
     'public.job_analyses'::regclass,
     'public.job_match_analyses'::regclass,
     'public.tailoring_runs'::regclass
   ])),
  'every Phase 2 public table must have RLS enabled'
);
select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.job_analyses', 'select'),
  'anonymous users must not read job analyses'
);
select pg_temp.assert_true(
  has_table_privilege('authenticated', 'public.job_analyses', 'select'),
  'authenticated users need explicit Data API access'
);
select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.ai_audit_events', 'update'),
  'AI audit rows must be immutable'
);
select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.job_match_analyses', 'update'),
  'job-match history must be immutable'
);
select pg_temp.assert_true(
  not has_schema_privilege('anon', 'private', 'usage')
    and not has_table_privilege('anon', 'private.ai_action_limits', 'select')
    and has_table_privilege('authenticated', 'private.ai_action_limits', 'select'),
  'AI entitlement limits must stay private while remaining readable by the atomic claim function'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated',
    'phase-two-a@example.test', '', now(), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Phase Two A"}', now(), now()
  ),
  (
    '44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated',
    'phase-two-b@example.test', '', now(), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Phase Two B"}', now(), now()
  );

update public.profiles
set profile_revision = 2
where id = '33333333-3333-4333-8333-333333333333';

insert into public.applications (
  id, user_id, company_name, role_title, job_description
)
values
  (
    '33333333-3333-4333-8333-333333333301',
    '33333333-3333-4333-8333-333333333333',
    'Example A', 'Platform Engineer', 'Requires PostgreSQL and TypeScript.'
  ),
  (
    '33333333-3333-4333-8333-333333333302',
    '33333333-3333-4333-8333-333333333333',
    'Example A2', 'Backend Engineer', 'Requires Go.'
  ),
  (
    '44444444-4444-4444-8444-444444444401',
    '44444444-4444-4444-8444-444444444444',
    'Example B', 'Security Engineer', 'Requires security clearance.'
  );

insert into public.resumes (
  id, user_id, name, editor_mode, document_schema_version,
  structured_content, template_id, row_version
)
values
  (
    '33333333-3333-4333-8333-333333333311',
    '33333333-3333-4333-8333-333333333333',
    'Base A', 'structured', 1,
    '{"schemaVersion":1,"sections":[],"presentation":{"templateId":"minimal-modern"}}',
    'minimal-modern', 0
  ),
  (
    '33333333-3333-4333-8333-333333333312',
    '33333333-3333-4333-8333-333333333333',
    'Base A2', 'structured', 1,
    '{"schemaVersion":1,"sections":[],"presentation":{"templateId":"minimal-modern"}}',
    'minimal-modern', 0
  ),
  (
    '44444444-4444-4444-8444-444444444411',
    '44444444-4444-4444-8444-444444444444',
    'Base B', 'structured', 1,
    '{"schemaVersion":1,"sections":[],"presentation":{"templateId":"minimal-modern"}}',
    'minimal-modern', 0
  );

insert into public.resume_versions (
  id, user_id, application_id, base_resume_id, title, editor_mode,
  document_schema_version, structured_content, template_id, row_version
)
values
  (
    '33333333-3333-4333-8333-333333333321',
    '33333333-3333-4333-8333-333333333333',
    '33333333-3333-4333-8333-333333333302',
    '33333333-3333-4333-8333-333333333312',
    'A2 tailored', 'structured', 1,
    '{"schemaVersion":1,"sections":[],"presentation":{"templateId":"minimal-modern"}}',
    'minimal-modern', 0
  ),
  (
    '44444444-4444-4444-8444-444444444421',
    '44444444-4444-4444-8444-444444444444',
    '44444444-4444-4444-8444-444444444401',
    '44444444-4444-4444-8444-444444444411',
    'B tailored', 'structured', 1,
    '{"schemaVersion":1,"sections":[],"presentation":{"templateId":"minimal-modern"}}',
    'minimal-modern', 0
  );

insert into public.profile_experiences (
  id, user_id, kind, job_title, company, original_text, approved_text,
  source_kind, verification_status, position
)
values
  (
    '33333333-3333-4333-8333-333333333331',
    '33333333-3333-4333-8333-333333333333',
    'work', 'Engineer', 'Example A', 'Built a service.', 'Built a service.',
    'manual', 'user_confirmed', 0
  ),
  (
    '44444444-4444-4444-8444-444444444431',
    '44444444-4444-4444-8444-444444444444',
    'work', 'Engineer', 'Example B', 'Secured a service.', 'Secured a service.',
    'manual', 'user_confirmed', 0
  );

insert into public.profile_bullets (
  id, user_id, experience_id, original_text, approved_text,
  source_kind, verification_status, position
)
values
  (
    '33333333-3333-4333-8333-333333333341',
    '33333333-3333-4333-8333-333333333333',
    '33333333-3333-4333-8333-333333333331',
    'Improved PostgreSQL reliability.', 'Improved PostgreSQL reliability.',
    'manual', 'user_confirmed', 0
  ),
  (
    '44444444-4444-4444-8444-444444444441',
    '44444444-4444-4444-8444-444444444444',
    '44444444-4444-4444-8444-444444444431',
    'Improved security.', 'Improved security.',
    'manual', 'user_confirmed', 0
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);

insert into public.resume_analyses (
  id, user_id, resume_id, document_row_version, overall_score
)
values (
  '33333333-3333-4333-8333-333333333351',
  '33333333-3333-4333-8333-333333333333',
  '33333333-3333-4333-8333-333333333311',
  0, 82
);

insert into public.profile_bullet_suggestions (
  id, user_id, profile_bullet_id, resume_id, mode, original_text,
  suggested_text, explanation, confidence
)
values (
  '33333333-3333-4333-8333-333333333352',
  '33333333-3333-4333-8333-333333333333',
  '33333333-3333-4333-8333-333333333341',
  '33333333-3333-4333-8333-333333333311',
  'clarity', 'Improved PostgreSQL reliability.',
  'Improved PostgreSQL reliability.', 'No factual change.', 0.9
);

insert into public.job_analyses (
  id, user_id, application_id, source_text_snapshot, structured_data,
  field_confidence, warnings, status, confirmed_at
)
values
  (
    '33333333-3333-4333-8333-333333333361',
    '33333333-3333-4333-8333-333333333333',
    '33333333-3333-4333-8333-333333333301',
    'Requires PostgreSQL and TypeScript.',
    '{"company":"Example A","roleTitle":"Platform Engineer","applicationDeadline":""}',
    '{"company":1,"roleTitle":1}', '[]', 'confirmed', now()
  ),
  (
    '33333333-3333-4333-8333-333333333362',
    '33333333-3333-4333-8333-333333333333',
    '33333333-3333-4333-8333-333333333302',
    'Requires Go.',
    '{"company":"Example A2","roleTitle":"Backend Engineer","applicationDeadline":""}',
    '{"company":1,"roleTitle":1}', '[]', 'confirmed', now()
  );

insert into public.job_match_analyses (
  id, user_id, application_id, job_analysis_id, resume_id,
  resume_row_version, profile_revision, job_analysis_updated_at,
  overall_score
)
select
  '33333333-3333-4333-8333-333333333371',
  '33333333-3333-4333-8333-333333333333',
  '33333333-3333-4333-8333-333333333301',
  '33333333-3333-4333-8333-333333333361',
  '33333333-3333-4333-8333-333333333311',
  0, 2, updated_at, 75
from public.job_analyses
where id = '33333333-3333-4333-8333-333333333361';

select pg_temp.assert_true(
  (select count(*) = 1 from public.resume_analyses where user_id = '33333333-3333-4333-8333-333333333333'),
  'an authenticated user must read their own resume history'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.job_match_analyses where user_id = '33333333-3333-4333-8333-333333333333'),
  'an authenticated user must read their own match history'
);

do $test$
begin
  begin
    insert into public.resume_analyses (
      user_id, resume_id, document_row_version, overall_score
    ) values (
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444411', 0, 50
    );
    raise exception 'Expected cross-user resume ownership rejection';
  exception when foreign_key_violation then null;
  end;

  begin
    insert into public.profile_bullet_suggestions (
      user_id, profile_bullet_id, resume_id, mode, original_text,
      suggested_text, explanation, confidence
    ) values (
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444441',
      '33333333-3333-4333-8333-333333333311',
      'clarity', 'a', 'a', 'a', 0.5
    );
    raise exception 'Expected cross-user bullet ownership rejection';
  exception when foreign_key_violation then null;
  end;

  begin
    insert into public.job_match_analyses (
      user_id, application_id, job_analysis_id, resume_id,
      resume_row_version, profile_revision, job_analysis_updated_at,
      overall_score
    ) select
      '33333333-3333-4333-8333-333333333333',
      '33333333-3333-4333-8333-333333333301',
      '33333333-3333-4333-8333-333333333362',
      '33333333-3333-4333-8333-333333333311',
      0, 2, updated_at, 50
    from public.job_analyses where id = '33333333-3333-4333-8333-333333333362';
    raise exception 'Expected job-analysis/application mismatch rejection';
  exception when foreign_key_violation then null;
  end;

  begin
    insert into public.job_match_analyses (
      user_id, application_id, job_analysis_id, resume_version_id,
      resume_row_version, profile_revision, job_analysis_updated_at,
      overall_score
    ) select
      '33333333-3333-4333-8333-333333333333',
      '33333333-3333-4333-8333-333333333301',
      '33333333-3333-4333-8333-333333333361',
      '33333333-3333-4333-8333-333333333321',
      0, 2, updated_at, 50
    from public.job_analyses where id = '33333333-3333-4333-8333-333333333361';
    raise exception 'Expected tailored-resume/application mismatch rejection';
  exception when foreign_key_violation then null;
  end;

  begin
    insert into public.resume_analyses (
      user_id, resume_id, resume_version_id, document_row_version, overall_score
    ) values (
      '33333333-3333-4333-8333-333333333333',
      '33333333-3333-4333-8333-333333333311',
      '33333333-3333-4333-8333-333333333321', 0, 50
    );
    raise exception 'Expected exactly-one-resume rejection';
  exception when check_violation then null;
  end;

  begin
    insert into public.resume_analyses (
      user_id, resume_id, document_row_version, overall_score, deductions
    ) values (
      '33333333-3333-4333-8333-333333333333',
      '33333333-3333-4333-8333-333333333311', 0, 50, '{}'
    );
    raise exception 'Expected JSON shape rejection';
  exception when check_violation then null;
  end;

  begin
    insert into public.resume_analyses (
      user_id, resume_id, document_row_version, overall_score
    ) values (
      '33333333-3333-4333-8333-333333333333',
      '33333333-3333-4333-8333-333333333311', 0, 101
    );
    raise exception 'Expected score range rejection';
  exception when check_violation then null;
  end;

  begin
    insert into public.profile_bullet_suggestions (
      user_id, profile_bullet_id, resume_id, mode, original_text,
      suggested_text, explanation, confidence
    ) values (
      '33333333-3333-4333-8333-333333333333',
      '33333333-3333-4333-8333-333333333341',
      '33333333-3333-4333-8333-333333333311',
      'clarity', 'a', 'a', 'a', 1.2
    );
    raise exception 'Expected confidence range rejection';
  exception when check_violation then null;
  end;
end;
$test$;

insert into public.tailoring_runs (
  id, user_id, application_id, source_resume_id, source_resume_row_version,
  job_match_analysis_id, proposed_document, changes, evidence_matrix
)
values
  (
    '33333333-3333-4333-8333-333333333381',
    '33333333-3333-4333-8333-333333333333',
    '33333333-3333-4333-8333-333333333301',
    '33333333-3333-4333-8333-333333333311', 0,
    '33333333-3333-4333-8333-333333333371',
    '{"schemaVersion":1,"sections":[],"presentation":{"templateId":"minimal-modern"}}',
    '[{"id":"safe","type":"section_order","targetId":"document","label":"Safe","reason":"Safe reorder","before":[],"after":[],"evidenceRequirementIds":[],"unsupportedClaims":[],"defaultSelected":true}]',
    '[]'
  ),
  (
    '33333333-3333-4333-8333-333333333382',
    '33333333-3333-4333-8333-333333333333',
    '33333333-3333-4333-8333-333333333301',
    '33333333-3333-4333-8333-333333333311', 0,
    '33333333-3333-4333-8333-333333333371',
    '{"schemaVersion":1,"sections":[],"presentation":{"templateId":"minimal-modern"}}',
    '[{"id":"unsafe","type":"bullet_rewrite","targetId":"entry:bullet","label":"Unsafe","reason":"Invented","before":"a","after":"Increased 99%","evidenceRequirementIds":[],"unsupportedClaims":["99%"],"defaultSelected":false}]',
    '[]'
  ),
  (
    '33333333-3333-4333-8333-333333333383',
    '33333333-3333-4333-8333-333333333333',
    '33333333-3333-4333-8333-333333333301',
    '33333333-3333-4333-8333-333333333311', 0,
    '33333333-3333-4333-8333-333333333371',
    '{"schemaVersion":1,"sections":[],"presentation":{"templateId":"minimal-modern"}}',
    '[]', '[]'
  );

do $test$
declare
  first_version uuid;
  second_version uuid;
begin
  first_version := public.apply_tailoring_run(
    '33333333-3333-4333-8333-333333333381',
    array['safe'],
    'Example A tailored',
    '{"schemaVersion":1,"sections":[],"presentation":{"templateId":"minimal-modern"}}'
  );
  second_version := public.apply_tailoring_run(
    '33333333-3333-4333-8333-333333333381',
    array['safe'],
    'Example A tailored',
    '{"schemaVersion":1,"sections":[],"presentation":{"templateId":"minimal-modern"}}'
  );
  if first_version is null or first_version <> second_version then
    raise exception 'Atomic apply must be idempotent';
  end if;

  begin
    perform public.apply_tailoring_run(
      '33333333-3333-4333-8333-333333333382',
      array['unsafe'],
      'Unsafe tailored',
      '{"schemaVersion":1,"sections":[],"presentation":{"templateId":"minimal-modern"}}'
    );
    raise exception 'Expected unsupported tailoring claim rejection';
  exception when invalid_parameter_value then null;
  end;

  update public.resumes
  set row_version = 1
  where id = '33333333-3333-4333-8333-333333333311';
  begin
    perform public.apply_tailoring_run(
      '33333333-3333-4333-8333-333333333383',
      '{}'::text[],
      'Stale tailored',
      '{"schemaVersion":1,"sections":[],"presentation":{"templateId":"minimal-modern"}}'
    );
    raise exception 'Expected stale tailoring run rejection';
  exception when serialization_failure then null;
  end;
end;
$test$;

select pg_temp.assert_true(
  (
    select status = 'applied' and output_resume_version_id is not null
    from public.tailoring_runs
    where id = '33333333-3333-4333-8333-333333333381'
  ),
  'atomic tailoring apply must persist the output relationship'
);
select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.resume_versions
    where generation_metadata ->> 'tailoring_run_id' =
      '33333333-3333-4333-8333-333333333381'
  ),
  'idempotent apply must create exactly one tailored version'
);

select pg_temp.assert_true(
  (
    public.confirm_job_analysis(
      '33333333-3333-4333-8333-333333333361',
      '{"company":"Corrected A","roleTitle":"Senior Platform Engineer","location":"Toronto","applicationDeadline":"2026-12-31"}'
    )
  ).status = 'confirmed',
  'job confirmation RPC must return the confirmed analysis'
);
select pg_temp.assert_true(
  (
    select company_name = 'Corrected A'
      and role_title = 'Senior Platform Engineer'
      and deadline = '2026-12-31'::date
    from public.applications
    where id = '33333333-3333-4333-8333-333333333301'
  ),
  'job confirmation must atomically update application facts'
);

do $test$
declare
  claim record;
  i integer;
begin
  for i in 1..12 loop
    select * into claim
    from public.claim_ai_usage(
      'resume_analysis', 'resume', '33333333-3333-4333-8333-333333333311'
    );
  end loop;
  if claim.remaining <> 0 or claim.limit_value <> 12 then
    raise exception 'Centralized usage claim returned the wrong limit';
  end if;
  begin
    perform public.claim_ai_usage(
      'resume_analysis', 'resume', '33333333-3333-4333-8333-333333333311'
    );
    raise exception 'Expected atomic usage limit rejection';
  exception when raise_exception then
    if sqlerrm not like 'AI_RATE_LIMITED:%' then
      raise;
    end if;
  end;
end;
$test$;

select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);

select pg_temp.assert_true(
  (select count(*) = 0 from public.resume_analyses where id = '33333333-3333-4333-8333-333333333351'),
  'RLS must hide another user''s resume analysis'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.profile_bullet_suggestions where id = '33333333-3333-4333-8333-333333333352'),
  'RLS must hide another user''s bullet suggestion'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.job_analyses where id = '33333333-3333-4333-8333-333333333361'),
  'RLS must hide another user''s job analysis'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.job_match_analyses where id = '33333333-3333-4333-8333-333333333371'),
  'RLS must hide another user''s match'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.tailoring_runs where id = '33333333-3333-4333-8333-333333333381'),
  'RLS must hide another user''s tailoring run'
);

do $test$
begin
  begin
    insert into public.ai_audit_events (user_id, action, outcome)
    values (
      '33333333-3333-4333-8333-333333333333',
      'job_match', 'succeeded'
    );
    raise exception 'Expected cross-user audit insertion denial';
  exception when insufficient_privilege then null;
  end;
end;
$test$;

rollback;
