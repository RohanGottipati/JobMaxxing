# JobMaxxing

Job application tracker — help users organize their job search pipeline.

## Stack

- Next.js 16 App Router (`src/app/`)
- Supabase for auth + Postgres (`src/lib/supabase/`, `supabase/migrations/`)
- shadcn/ui components (`src/components/ui/`)
- Tailwind CSS v4 (`src/app/globals.css`)

## Key routes

| Route | Purpose |
|-------|---------|
| `/` | Redirects to `/applications` (signed in) or `/login` |
| `/login` | Email + password sign in |
| `/signup` | Email + password registration |
| `/applications` | Application board (auth required) |
| `/applications/new` | Create application (auth required) |
| `/applications/[id]` | Application detail + package manager (auth required) |
| `/profile` | User profile (auth required) |
| `/auth/callback` | Supabase email-confirmation callback |

## Database

- `profiles` — user profile, auto-created on signup
- `applications` — the hub for each tracked role (status enum, deadlines, package pointers)
- `resumes` — reusable base/master resumes
- `resume_versions` — tailored resume versions saved per application
- `cover_letters` — cover letter versions saved per application
- `application_packages` (view) — an application joined with its submitted resume version + cover letter
- `job_applications` — legacy v1 table, superseded by `applications`

Each application can hold many resume versions and cover letters, but only one of each may
be marked submitted (enforced by partial unique indexes). Submitted documents are
content-locked; duplicate them before editing. Submission goes through the
`submit_resume_version` / `submit_cover_letter` RPCs. Data access helpers live in
`src/lib/applications/packages.ts`.

RLS is enabled on all tables. Users can only access their own rows.

## Env vars

Required in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Conventions

- Use `@/` import alias
- Server Components by default; add `"use client"` only when needed
- Supabase server client in Server Components/actions; browser client in client components
- Run `supabase db push` after changing migrations
