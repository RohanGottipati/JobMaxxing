-- Internal trigger functions must not be callable through the Data API.
-- Trigger and event-trigger execution does not depend on these direct grants.

alter function public.set_updated_at() set search_path = '';

revoke all on function public.handle_new_user()
  from public, anon, authenticated, service_role;

revoke all on function public.rls_auto_enable()
  from public, anon, authenticated, service_role;
