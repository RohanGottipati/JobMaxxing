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
| `/` | Marketing landing page |
| `/login` | Magic-link sign in |
| `/dashboard` | Application list (auth required) |
| `/applications/new` | Create application (auth required) |
| `/auth/callback` | Supabase OAuth/magic-link callback |

## Database

- `profiles` — user profile, auto-created on signup
- `job_applications` — tracked roles with status enum

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
