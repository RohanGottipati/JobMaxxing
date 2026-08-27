# JobMaxxing

Job search tracker built with Next.js and Supabase. Track applications from saved → applied → interview → offer in one place.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui
- **Backend:** Supabase (Postgres, Auth, RLS)
- **Language:** TypeScript

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file and add your Supabase credentials:

```bash
cp .env.example .env.local
```

Get `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your [hosted Supabase project API settings](https://supabase.com/dashboard/project/_/settings/api).

Resume import and deterministic parsing work without an AI key. To enable AI-assisted parsing and Maxwell, add a [Gemini API key](https://aistudio.google.com/app/apikey) as `GEMINI_API_KEY`; it is read only by server routes and must never use a `NEXT_PUBLIC_` prefix. `GEMINI_MODEL` is optional and defaults to `gemini-2.5-flash`.

Google and GitHub login are optional. Configure the provider in Supabase Auth, then set `AUTH_GOOGLE_ENABLED=true` or `AUTH_GITHUB_ENABLED=true` on the Next.js server.

### 3. Set up the database

Link your hosted Supabase project, review the pending migration, and push it. No local Supabase stack or Docker installation is required.

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase migration list --linked
supabase db push --linked --dry-run
npm run db:push
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Maxwell workspace assistant

Open **Maxwell** from the app sidebar. It has a dedicated full-page chat workspace with saved conversation history. Opening it from an application or document carries that page in as removable, validated context.

Maxwell can:

- import a job description with a PDF/DOCX resume and cover letter into one linked application package;
- search and assess your applications, career profile, resumes, and cover letters;
- create or update application cards and editable plain-text, Markdown, or LaTeX document source;
- flag unsupported claims in generated documents for review;
- move cards, mark documents submitted, and manage saved conversation threads.

Explicit create or update instructions run automatically. Ambiguous writes ask for confirmation, and deletes always require confirmation. Maxwell does not browse the web, submit job applications, send email, or compile PDF/DOCX output.

## AI resume and application intelligence

Open **Career match** from a saved application to:

- parse and explicitly confirm job requirements before they affect a score;
- compare a structured resume with the job through an explainable score and evidence matrix;
- review safe tailoring diffs and create a separate application-specific resume without overwriting the master;
- generate grounded, versioned cover letters with evidence per paragraph, history, shorten/expand, paragraph regeneration, copy, and editor/export handoff.

Saved HTTPS job URLs can be imported from Greenhouse, Lever, Ashby, Workday, iCIMS, Workable, SmartRecruiters, LinkedIn, and Indeed. The server validates hosts and resolved IPs, revalidates redirects, limits time/content type/response size, and never treats imported fields as confirmed. Some providers block server-side access; paste the description when the import fallback message appears.

## Project structure

```
src/
  app/                  # Next.js App Router pages
  components/           # UI and feature components
  lib/supabase/         # Supabase client helpers (server + browser)
  lib/applications/     # Application/package data helpers, types, repository
  lib/maxwell/          # Gemini orchestration, tools, policies, and persistence
  types/                # Database types
supabase/
  migrations/           # SQL migrations
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run focused unit tests |
| `npm run test:e2e:public` | Run public responsive Playwright checks |
| `npm run test:e2e` | Run the complete authenticated responsive browser suite |
| `npm run db:push` | Push migrations to the linked hosted Supabase project |
| `npm run db:types` | Generate types from the linked hosted Supabase project |

## Auth

Email + password auth via Supabase. Enable the Email provider in your Supabase dashboard under Authentication → Providers. Register at `/signup` and sign in at `/login`.

If "Confirm email" is enabled, new users confirm via an emailed link that lands on `/auth/callback`; add `http://localhost:3000/auth/callback` to your redirect URLs in Supabase Auth settings. To allow instant sign-in during development, you can disable email confirmation.

## Browser regression tests

Install Playwright browsers once with `npx playwright install`. Public marketing and auth checks run without credentials. The complete suite requires `E2E_EMAIL` and `E2E_PASSWORD` for a dedicated disposable hosted account; it creates and removes its application, resume, and import fixtures. Set `E2E_BASE_URL` to test an already-running deployment instead of the local Next.js development server.

## Railway deployment

The repository includes `railway.json` and builds a minimal Next.js standalone server. Railway must provide these variables during both the build and runtime phases:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

`GEMINI_API_KEY`, `GEMINI_MODEL`, `AUTH_GOOGLE_ENABLED`, and `AUTH_GITHUB_ENABLED` are optional. Railway promotes a deployment only after `/api/health` can reach hosted Supabase Auth and the Data API; the health endpoint reports Gemini availability without failing when optional AI is disabled.

For email confirmation and password recovery in production, set the Supabase Auth Site URL to the Railway public origin and add this redirect URL:

```text
https://<your-railway-domain>/auth/callback
```

Railway injects `PORT`; the standalone Next.js server reads it automatically.

## License

Private
