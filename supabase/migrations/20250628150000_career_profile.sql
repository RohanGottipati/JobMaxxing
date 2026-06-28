-- JobMaxxing career profile
--
-- The profile page is the user's "career source of truth": free-form personal info plus
-- repeatable sections (experience, education, projects, skills, achievements) that later
-- feed tailored resume and cover letter generation. Each section lives in its own table so
-- rows can be ordered and edited independently, and everything is owned + guarded by RLS.

-- 1. Extend the existing profile with the new personal-info fields.
alter table public.profiles
  add column if not exists phone text,
  add column if not exists location text,
  add column if not exists summary text,
  add column if not exists additional_info text;

-- 2. Work vs. volunteer experiences share a shape, distinguished by kind.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'profile_experience_kind') then
    create type public.profile_experience_kind as enum ('work', 'volunteer');
  end if;
end
$$;

-- 3. Helper to wire RLS + ordering + updated_at onto each section table.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Personal links (LinkedIn, GitHub, portfolio, ...)
create table if not exists public.profile_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null default '',
  url text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Work + volunteer experience
create table if not exists public.profile_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.profile_experience_kind not null default 'work',
  job_title text not null default '',
  company text not null default '',
  location text,
  start_date text,
  end_date text,
  is_current boolean not null default false,
  responsibilities text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Education
create table if not exists public.profile_education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  school text not null default '',
  degree text,
  field text,
  location text,
  start_date text,
  end_date text,
  is_current boolean not null default false,
  details text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Projects
create table if not exists public.profile_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  date text,
  url text,
  description text,
  tech_stack text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Skills (one tag per row)
create table if not exists public.profile_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Achievements + extracurriculars
create table if not exists public.profile_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  description text,
  date text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Indexes, RLS, and triggers for every section table.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profile_links',
    'profile_experiences',
    'profile_education',
    'profile_projects',
    'profile_skills',
    'profile_achievements'
  ]
  loop
    execute format(
      'create index if not exists %I on public.%I (user_id, position);',
      tbl || '_user_position_idx',
      tbl
    );

    execute format('alter table public.%I enable row level security;', tbl);

    execute format(
      'drop policy if exists "Users manage own %1$s" on public.%1$I;',
      tbl
    );
    execute format(
      'create policy "Users manage own %1$s" on public.%1$I '
      || 'for all to authenticated '
      || 'using ((select auth.uid()) = user_id) '
      || 'with check ((select auth.uid()) = user_id);',
      tbl
    );

    execute format('drop trigger if exists %1$s on public.%2$I;', tbl || '_updated_at', tbl);
    execute format(
      'create trigger %1$s before update on public.%2$I '
      || 'for each row execute function public.set_updated_at();',
      tbl || '_updated_at',
      tbl
    );
  end loop;
end
$$;
