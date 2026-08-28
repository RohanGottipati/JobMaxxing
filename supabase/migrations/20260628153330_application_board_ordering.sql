-- JobMaxxing Trello-style board ordering
--
-- The applications board renders one column per status. Within a column cards must keep a
-- stable, user-defined order, so we add an explicit `position` to applications and an atomic
-- RPC that persists status + position changes when cards are dragged.

-- 1. Per-column ordering value. Lower positions render first within a status column.
alter table public.applications
  add column if not exists position integer not null default 0;

-- 2. Backfill a sensible initial order for existing rows: newest first within each column,
--    mirroring the previous created_at DESC sort so nothing visibly jumps after deploy.
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, status
      order by created_at desc
    ) - 1 as rn
  from public.applications
)
update public.applications a
  set position = ranked.rn
  from ranked
  where ranked.id = a.id;

-- 3. Composite index supporting the board's "order by status, position" read pattern.
create index if not exists applications_user_status_position_idx
  on public.applications (user_id, status, position);

-- 4. Atomic reorder helper used on drag end. Accepts a JSON array of
--    { id, status, position } objects and applies them in a single statement.
--    SECURITY INVOKER (default) so RLS applies; the explicit user_id guard is defence in depth.
create or replace function public.reorder_applications(p_updates jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.applications a
    set
      status = (item->>'status')::public.application_status,
      position = (item->>'position')::integer
    from jsonb_array_elements(p_updates) as item
    where a.id = (item->>'id')::uuid
      and a.user_id = (select auth.uid());
end;
$$;
