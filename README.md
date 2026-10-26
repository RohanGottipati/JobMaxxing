# JobMaxxing

Private job-search workspace: track every application with its job post, next action, resume and cover letter, with optional Gemini-assisted analysis and document tailoring.

JobMaxxing does **not** submit applications, contact employers or send email.

## Features

- **Application tracker** — searchable list-and-detail mailbox at `/applications` with status filters (Saved, Applied, Online Assessment, Interview, Final Round, Offer, Rejected, Withdrawn), All / Active pipeline / Closed scopes, and per-application Overview, Job post, Resume, Cover letter and Notes tabs.
- **Documents** — master and tailored resumes plus cover letters; structured, plain-text and Markdown editors, checkpoints and restore, PDF/DOCX export, and submission locks (submitted versions are read-only; duplicate to keep editing).
- **Resume import** — PDF, DOCX and text import with deterministic parsing and optional Gemini assistance, followed by a review step.
- **Career match** — parse and confirm job requirements, compare a resume through an explainable score and evidence matrix, review tailoring diffs that create a separate resume version, and generate grounded, versioned cover letters.
- **Job URL import** — saved HTTPS job URLs from Greenhouse, Lever, Ashby, Workday, iCIMS, Workable, SmartRecruiters, LinkedIn and Indeed, with host/IP validation, redirect revalidation and size/time limits.
- **Maxwell assistant** — saved conversation threads that can search and update applications, career profile, resumes and cover letters, with confirmation for ambiguous writes and all deletes.
- **Onboarding** — three-step flow: basics and targets, optional resume, then AI consent.
- **Chrome extension API** — Bearer-JWT routes under `/api/extension/` used by the companion [JobMaxxing-extension](https://github.com/RohanGottipati/JobMaxxing-extension).
- **Public pages** — `/`, `/extension` and `/privacy`, with canonical/social metadata, generated share images, `robots.txt`, `sitemap.xml` and a web manifest.

## Tech stack

- **Framework:** Next.js 16 (App Router, standalone output), React 19, TypeScript
- **UI:** Tailwind CSS v4, shadcn/ui (Radix + Base UI), lucide-react, sonner, next-themes, dnd-kit
- **Backend:** Supabase (Postgres with RLS, Auth, private Storage) via `@supabase/ssr`
- **AI (optional):** Google Gemini via `@google/genai`
- **Documents:** `@react-pdf/renderer`, `docx`, `mammoth`, `pdf-parse`, `pdfjs-dist` / `react-pdf`, DOMPurify
- **Validation:** Zod
- **Tests:** `node --test` with `tsx` (unit), Playwright + axe-core (browser)

## Project structure

```
src/
  app/
    (marketing)/        # Public pages: landing, login, signup, password recovery, /extension, /privacy
    (onboarding)/       # First-run onboarding wizard
    (app)/              # Authenticated workspace: dashboard, applications, resumes, cover letters, Maxwell, profile, help
    api/                # Route handlers (internal session-cookie routes + /api/extension/* Bearer-JWT routes + /api/health)
    auth/callback/      # Supabase email-confirmation callback
    resumes/**/print/   # Print views
  components/           # Feature components and shadcn/ui primitives (components/ui)
  lib/                  # Business logic: supabase, applications, job-intelligence, resumes, resume-imports,
                        # resume-analysis, maxwell, extension, documents, previews, ai, http, profile, career
  proxy.ts              # Next.js proxy (middleware) that refreshes the Supabase session
  types/database.ts     # Supabase database types
supabase/
  migrations/           # Ordered SQL schema history
  tests/                # SQL checks for the phase-one and phase-two schema
tests/e2e/              # Playwright specs and auth setup/cleanup
scripts/                # copy-runtime-workers.mjs (copies the PDF.js worker into public/ on install)
```

More detail: [`ARCHITECTURE.md`](ARCHITECTURE.md), [`LOCAL_TESTING.md`](LOCAL_TESTING.md), [`docs/PRODUCT_AND_UX.md`](docs/PRODUCT_AND_UX.md) and the release backlog in [`docs/REMAINING_IMPLEMENTATION_PLAN.md`](docs/REMAINING_IMPLEMENTATION_PLAN.md).

## Prerequisites

- Node.js ≥ 22.3 and npm
- A hosted Supabase project
- [Supabase CLI](https://supabase.com/docs/guides/cli) for applying migrations (no local Supabase stack or Docker required)
- Optional: a [Gemini API key](https://aistudio.google.com/app/apikey) for AI features

## Getting started

### 1. Install dependencies

```bash
npm install
```

`postinstall` copies the PDF.js worker to `public/pdf.worker.min.mjs` (gitignored).

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in the values described under [Environment variables](#environment-variables).

### 3. Set up the database

Link your hosted Supabase project, review pending migrations, and push them:

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

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable (browser) key, constrained by grants, Auth and RLS. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Legacy fallback used only when the publishable key is unset. |
| `NEXT_PUBLIC_APP_URL` | Yes in production | Canonical app origin for metadata, share images, sitemap and the derived auth-cookie domain. Falls back to `https://job-maxxing.vercel.app` when unset. |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | No | Overrides the auth-cookie domain derived from `NEXT_PUBLIC_APP_URL`. Leave unset locally. |
| `GEMINI_API_KEY` | No | Enables AI-assisted parsing, tailoring, cover letters and Maxwell. Server-only; never prefix with `NEXT_PUBLIC_`. |
| `GEMINI_MODEL` | No | Gemini model name; defaults to `gemini-2.5-flash`. |
| `AUTH_GOOGLE_ENABLED` / `AUTH_GITHUB_ENABLED` | No | Set to `true` to show Google / GitHub login once the provider is configured in Supabase Auth. |
| `E2E_EMAIL` / `E2E_PASSWORD` | Authenticated E2E only | Dedicated disposable account for the full Playwright suite. |
| `E2E_BASE_URL` | No | Run Playwright against an already-running deployment instead of starting `npm run dev`. |

`next build` fails in production mode if the Supabase URL or key is missing or still a placeholder from `.env.example`.

## Auth

Email + password auth via Supabase: enable the Email provider under Authentication → Providers, then register at `/signup` and sign in at `/login`. Password recovery uses `/forgot-password` and `/reset-password`.

If "Confirm email" is enabled, confirmation links land on `/auth/callback`; add `http://localhost:3000/auth/callback` (and your production origin's callback) to the Supabase Auth redirect URLs. You can disable email confirmation for local development.

## Chrome extension

Job capture from the browser lives in **[JobMaxxing-extension](https://github.com/RohanGottipati/JobMaxxing-extension)**.

1. Apply the latest migrations in this repo (`npm run db:push`).
2. Clone the extension repo, copy `config.example.js` → `config.js`, and use the same Supabase URL/publishable key plus `APP_URL=http://localhost:3000` during local development.
3. Load it unpacked in Chrome (`chrome://extensions` → Developer mode).
4. Open the side panel from the toolbar icon, sign in with your JobMaxxing account, capture a job, optionally attach the PDF/DOCX resume and cover letter you used, and confirm the package appears on `/applications`.

Application records go through authenticated routes under `/api/extension/`; attached files upload to user-scoped private Storage paths. Saving a job description starts server-side parsing; Gemini is used only when it is configured and the account has granted AI consent.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server (webpack) |
| `npm run dev:turbo` | Start the development server with Turbopack |
| `npm run build` | Production standalone build (`postbuild` copies `public/` and static assets into `.next/standalone`) |
| `npm run start` | Run the standalone production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (`src/lib/**/*.test.ts`) |
| `npm run test:e2e:public` | Run public Playwright checks (no credentials needed) |
| `npm run test:e2e` | Run the complete Playwright suite (needs `E2E_EMAIL` / `E2E_PASSWORD`) |
| `npm run test:e2e:ui` | Open the Playwright UI runner |
| `npm run db:push` | Push migrations to the linked hosted Supabase project |
| `npm run db:types` | Generate types from the linked project into `src/types/database.generated.ts` (the app imports `src/types/database.ts`) |

## Browser regression tests

Install browsers once with `npx playwright install`. Public marketing and auth checks run without credentials. The complete suite signs in with `E2E_EMAIL` / `E2E_PASSWORD`, creates and removes its own application, resume and import fixtures, and runs across desktop, mobile, compact, WebKit tablet and Firefox wide viewports.

## Railway deployment

`railway.json` builds with `npm run build`, starts with `HOSTNAME=0.0.0.0 npm run start`, and promotes a deployment only after `/api/health` succeeds. Provide these variables during both build and runtime:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL
```

`GEMINI_API_KEY`, `GEMINI_MODEL`, `NEXT_PUBLIC_COOKIE_DOMAIN`, `AUTH_GOOGLE_ENABLED` and `AUTH_GITHUB_ENABLED` are optional. `/api/health` checks hosted Supabase Auth and the Data API and reports whether Gemini is configured without failing when it is not. Railway injects `PORT`; the standalone server reads it automatically.

For email confirmation and password recovery in production, set `NEXT_PUBLIC_APP_URL` and the Supabase Auth Site URL to the same public origin and allow `https://<your-domain>/auth/callback` in Supabase Auth.

Before publishing, verify that the production origin resolves, `/api/health` succeeds, `/robots.txt` and `/sitemap.xml` contain that origin, and the extension's `APP_URL` and manifest host permission match it.
