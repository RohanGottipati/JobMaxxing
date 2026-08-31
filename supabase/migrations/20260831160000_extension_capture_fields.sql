-- Extension capture metadata for JobMaxxing Chrome extension integration.
alter table public.applications
  add column if not exists source_host text,
  add column if not exists description_hash text,
  add column if not exists recruiting_season text;

create index if not exists applications_description_hash_idx
  on public.applications (user_id, description_hash)
  where description_hash is not null;

-- Surface extension fields through the package read model.
drop view if exists public.application_packages;

create view public.application_packages
with (security_invoker = true)
as
select
  a.id,
  a.user_id,
  a.company_name,
  a.role_title,
  a.job_url,
  a.job_description,
  a.location,
  a.status,
  a.deadline,
  a.date_applied,
  a.notes,
  a.referral_contact,
  a.next_action,
  a.submitted_resume_version_id,
  a.submitted_cover_letter_id,
  a.source_host,
  a.description_hash,
  a.recruiting_season,
  a.created_at,
  a.updated_at,
  case when rv.id is null then null else to_jsonb(rv.*) end as submitted_resume_version,
  case when cl.id is null then null else to_jsonb(cl.*) end as submitted_cover_letter,
  case
    when a.submitted_resume_version_id is not null and a.submitted_cover_letter_id is not null then 'package_complete'
    when a.submitted_resume_version_id is null and a.submitted_cover_letter_id is null then 'package_incomplete'
    when a.submitted_resume_version_id is null then 'resume_missing'
    else 'cover_letter_missing'
  end as package_status,
  a.position
from public.applications a
left join public.resume_versions rv on rv.id = a.submitted_resume_version_id
left join public.cover_letters cl on cl.id = a.submitted_cover_letter_id;

grant select on public.application_packages to authenticated;
