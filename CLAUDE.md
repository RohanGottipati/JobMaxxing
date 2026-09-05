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
| `/` | Public product page; signed-in users can open the workspace |
| `/extension` | Public Chrome extension overview |
| `/privacy` | Public web-app and extension data-handling summary |
| `/login` | Email + password sign in |
| `/signup` | Email + password registration |
| `/applications` | Searchable list-and-detail application mailbox (auth required) |
| `/applications/new` | Create application (auth required) |
| `/applications/[id]` | Application detail + package manager (auth required) |
| `/profile` | User profile (auth required) |
| `/auth/callback` | Supabase email-confirmation callback |
| `/api/extension/applications` | Chrome extension: save/list applications (Bearer JWT) |
| `/api/extension/applications/[id]/analyze` | Chrome extension: trigger job parse (Bearer JWT) |

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
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`NEXT_PUBLIC_SUPABASE_ANON_KEY` remains a legacy fallback)
- `NEXT_PUBLIC_APP_URL` (the canonical deployment origin used by public metadata and the sitemap)

## Chrome extension

The [JobMaxxing-extension](https://github.com/RohanGottipati/JobMaxxing-extension) repo is a capture-focused Chrome extension that shares this Supabase backend:

- Sign in with the same account as the web app
- Open in a persistent Chrome side panel and detect postings on LinkedIn, Workday, Greenhouse, Lever and Ashby
- Capture other pages when user initiation grants tab access and the page exposes recognizable job-posting signals; manual entry is always available
- Save applications via `/api/extension/applications` with duplicate detection
- Mirror the configured website's Supabase session and upload application-package files to private Storage paths
- Trigger deterministic server-side job parsing after description capture; use Gemini enrichment only when configured and consented

After pulling extension-related migrations, run `npm run db:push` so `applications` gains `source_host`, `description_hash`, and `recruiting_season`, and the `application_packages` view is recreated.

## Conventions

- Use `@/` import alias
- Server Components by default; add `"use client"` only when needed
- Supabase server client in Server Components/actions; browser client in client components
- Run `supabase db push` after changing migrations
