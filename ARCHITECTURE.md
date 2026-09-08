# Web App Architecture

> The **JobMaxxing web app** — the full workspace where users track applications,
> tailor resumes and cover letters, run AI job matching, and manage documents.
> It also owns the shared Supabase backend and the API the Chrome extension calls.
>
> Companion doc: [`../extension/ARCHITECTURE.md`](../extension/ARCHITECTURE.md).
> Both docs use the same section layout so you can read them side by side.

---

## 1. Role in the system

```
┌─────────────────┐        Bearer JWT (REST)         ┌──────────────────────┐
│ Chrome extension│ ───────────────────────────────▶ │  Web app  (this repo)│
│  (capture side) │        /api/extension/*          │  Next.js on Node     │
└────────┬────────┘                                  └───────────┬──────────┘
         │ shared Supabase session cookie                        │
         │ (two-way login mirror)                                │
         ▼                                                       ▼
                        ┌───────────────────────────────────────────┐
                        │  Supabase: Auth · Postgres (RLS) · Storage │
                        └───────────────────────────────────────────┘
```

The web app is the **system of record**. It defines the database schema, RLS
policies, storage buckets, and the REST surface the extension consumes. The
extension is a thin capture client that writes into this backend.

---

## 2. Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript (`@/` import alias → `src/`) |
| Runtime | Node.js ≥ 22.3 (standalone server output) |
| Auth + DB | Supabase (Postgres + Auth), `@supabase/ssr` |
| Storage | Supabase Storage (`job-documents` private bucket) |
| UI | shadcn/ui + Radix, Tailwind CSS v4 |
| AI | Google Gemini (`@google/genai`) |
| Docs/render | `@react-pdf/renderer`, `docx`, `mammoth`, `pdfjs-dist` |
| Validation | Zod |
| Tests | `node --test` (unit, `*.test.ts`), Playwright (e2e) |

---

## 3. Directory layout

```
web/
├── src/
│   ├── app/                    # Next.js App Router (routes + API)
│   │   ├── (marketing)/        # Public: landing, login, signup, privacy, /extension
│   │   ├── (onboarding)/       # First-run onboarding wizard
│   │   ├── (app)/              # Authenticated workspace (see §4)
│   │   ├── api/                # Route handlers (see §5)
│   │   ├── auth/               # Supabase email-confirmation callback
│   │   └── layout.tsx          # Root layout: theme, toaster, metadata
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── applications/ tracker/ resumes/ resume-imports/
│   │   ├── maxwell/            # AI assistant panel
│   │   ├── previews/ documents/ profile/ onboarding/ layout/ theme/
│   ├── lib/                    # Business logic (framework-agnostic core)
│   │   ├── supabase/           # Client/server/middleware factories, cookies
│   │   ├── applications/       # Application repository, status, packages
│   │   ├── job-intelligence/   # Job parse, matching, tailoring, cover letters
│   │   ├── resumes/ resume-analysis/ resume-imports/  # Resume pipeline
│   │   ├── maxwell/            # AI assistant (prompt, tools, SSE, policy)
│   │   ├── extension/          # Server logic backing /api/extension/*
│   │   ├── documents/ previews/ ai/ http/ auth/ profile/ career/
│   │   └── crypto/ documentation/ site.ts
│   ├── proxy.ts                # Next middleware entry → refreshes Supabase session
│   └── types/                  # Generated Supabase types + hand-written types
├── supabase/
│   ├── migrations/             # Ordered SQL schema history (source of truth)
│   └── tests/                  # pgTAP-style SQL tests
└── scripts/                    # Build helpers (copy runtime workers)
```

**Convention:** Server Components by default; `"use client"` only when needed.
Route/component files stay thin — real logic lives in `src/lib/*` repositories so
it is unit-testable and reusable by both UI and API routes.

---

## 4. Authenticated workspace routes (`app/(app)/`)

| Route | Purpose |
|-------|---------|
| `/dashboard` | Landing view once signed in |
| `/applications` | Searchable list + detail "mailbox" of tracked roles |
| `/applications/new`, `/applications/[id]` | Create / detail + package manager |
| `/applications/[id]/match`, `/package` | AI job match, submitted package |
| `/resumes`, `/resumes/[id]`, `/resumes/import` | Resume library + AI import |
| `/cover-letters` | Cover letter versions |
| `/maxwell` | AI workspace assistant |
| `/profile`, `/onboarding` | User profile + first-run setup |

---

## 5. API surface (`app/api/`)

Two audiences share the same backend logic in `src/lib/*`:

**Internal (session-cookie auth)** — used by the app's own client components:
`cover-letters/*`, `job-analyses/*`, `job-matches`, `resume-analysis`,
`resume-imports/*`, `maxwell/*`, `previews/*`, `documents/*`.

**Extension (Bearer-JWT auth)** — the contract the Chrome extension depends on:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/extension/applications` | `POST` | Save/update an application package (dupe-detected, 409 on conflict) |
| `/api/extension/applications` | `GET` | List the user's applications |
| `/api/extension/applications/[id]` | — | Single application operations |
| `/api/extension/applications/[id]/analyze` | `POST` | Trigger server-side job-description parse (Gemini only with consent) |

Bearer requests go through `requireBearerAuth` + `getAuthContextFromRequest`
(`src/lib/supabase/request-client.ts`); the shared implementation lives in
`src/lib/extension/applications.ts`. **Changing these request/response shapes is a
breaking change for the extension** — keep them in sync with
[`extension/ARCHITECTURE.md` §5](../extension/ARCHITECTURE.md).

---

## 6. Data model (Supabase Postgres)

Schema evolves only through ordered files in `supabase/migrations/`. **RLS is
enabled on every table; users only ever see their own rows.**

| Table / view | Role |
|--------------|------|
| `profiles` | User profile, auto-created on signup |
| `applications` | Hub for each tracked role (status enum, deadlines, `source_host`, `description_hash`, `recruiting_season`, package pointers) |
| `resumes` | Reusable base/master resumes |
| `resume_versions` | Tailored resume versions saved per application |
| `cover_letters` | Cover letter versions saved per application |
| `application_packages` (view) | Application joined to its submitted resume version + cover letter |
| `job_applications` | Legacy v1 table, superseded by `applications` |

An application can hold many resume versions and cover letters, but only one of
each may be **submitted** (partial unique indexes). Submitted documents are
content-locked — duplicate before editing. Submission goes through the
`submit_resume_version` / `submit_cover_letter` RPCs. Access helpers:
`src/lib/applications/packages.ts`.

After pulling extension-related migrations, run `npm run db:push`.

---

## 7. Auth & session model

- Supabase Auth (email + password). Session lives in a `sb-<ref>-auth-token`
  cookie scoped to the deployment origin.
- `proxy.ts` runs `updateSession` (`src/lib/supabase/middleware.ts`) on every
  matched request to refresh the session and re-issue cookies.
- Cookie scoping matters: the auth cookie is scoped to the **parent domain** so
  apex/www and token refresh both work (see the auth-cookie-domain fix).
- The extension reads/writes this same cookie to mirror login state (see §7 of
  the extension doc), and separately calls the API with the session's Bearer JWT.

---

## 8. Shared contract with the extension

Two integration points must stay aligned across the two repos:

1. **The `/api/extension/*` REST contract** (§5) — request/response schemas,
   status codes (esp. `409` duplicate), and `aiConsent` gating.
2. **The Supabase session cookie** (§7) — name, domain scope, and format, so the
   two-way login mirror keeps working.

If you change either, update the other repo and both ARCHITECTURE docs.

---

## 9. Environment & commands

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`…_ANON_KEY` = legacy fallback)
- `NEXT_PUBLIC_APP_URL` (canonical deployment origin)

```bash
npm run dev        # local dev (webpack)
npm run build      # standalone production build
npm test           # unit tests (node --test)
npm run test:e2e   # Playwright e2e
npm run db:push    # apply migrations to linked Supabase project
npm run db:types   # regenerate src/types/database.generated.ts
```
