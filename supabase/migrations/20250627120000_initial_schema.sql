-- JobMaxxing base schema

create extension if not exists "pgcrypto";

-- Application status enum
create type public.application_status as enum (
  'saved',
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
  'withdrawn'
);

-- User profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  headline text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Job applications
create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_name text not null,
  role_title text not null,
  job_url text,
  location text,
  status public.application_status not null default 'saved',
  applied_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_applications_user_id_idx on public.job_applications (user_id);
create index job_applications_status_idx on public.job_applications (status);

alter table public.job_applications enable row level security;

create policy "Users can view own applications"
  on public.job_applications for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own applications"
  on public.job_applications for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own applications"
  on public.job_applications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own applications"
  on public.job_applications for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at in sync
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger job_applications_updated_at
  before update on public.job_applications
  for each row execute function public.set_updated_at();
