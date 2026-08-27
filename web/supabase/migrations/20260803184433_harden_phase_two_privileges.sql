-- Supabase-managed default privileges grant broad table access to API roles.
-- Reset every Phase 2 table to the minimum operations used by the server
-- repositories, while RLS continues to enforce per-user row ownership.

revoke all on table
  public.ai_usage_events,
  public.ai_audit_events,
  public.resume_analyses,
  public.profile_bullet_suggestions,
  public.job_analyses,
  public.job_match_analyses,
  public.tailoring_runs
from anon, authenticated;

grant select, insert on public.ai_usage_events to authenticated;
grant select, insert on public.ai_audit_events to authenticated;
grant select, insert on public.resume_analyses to authenticated;
grant select, insert, update on public.profile_bullet_suggestions to authenticated;
grant select, insert, update on public.job_analyses to authenticated;
grant select, insert on public.job_match_analyses to authenticated;
grant select, insert, update on public.tailoring_runs to authenticated;

-- Entitlements remain outside the exposed Data API schema. The usage-claim
-- function can run as the caller because authenticated users receive only
-- read access to this one private lookup table.
alter table private.ai_action_limits enable row level security;

create policy "Authenticated users can view AI action limits"
  on private.ai_action_limits for select to authenticated
  using (true);

grant usage on schema private to authenticated;
grant select on private.ai_action_limits to authenticated;

alter function public.claim_ai_usage(text, text, uuid) security invoker;

-- These indexes duplicate existing unique-constraint indexes from Phase 1.
-- No foreign key depends on the duplicates.
drop index if exists public.applications_id_user_id_uidx;
drop index if exists public.resumes_id_user_id_uidx;
drop index if exists public.resume_versions_id_user_id_uidx;
drop index if exists public.profile_bullets_id_user_id_uidx;
