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

Get `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your [Supabase project API settings](https://supabase.com/dashboard/project/_/settings/api).

Maxwell, the built-in workspace assistant, also needs a [Gemini API key](https://aistudio.google.com/app/apikey). Set it as `GEMINI_API_KEY`; it is read only by server routes and must never use a `NEXT_PUBLIC_` prefix. `GEMINI_MODEL` is optional and defaults to `gemini-2.5-flash`.

### 3. Set up the database

Link your Supabase project and push migrations:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Or run locally with Docker:

```bash
supabase start
supabase db reset
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Maxwell workspace assistant

Open **Maxwell** from the app header. Conversations are private, saved to your account, and available from every authenticated page.

Maxwell can:

- import a job description with a PDF/DOCX resume and cover letter into one linked application package;
- search and assess your applications, career profile, resumes, and cover letters;
- create or update application cards and editable plain-text, Markdown, or LaTeX document source;
- flag unsupported claims in generated documents for review;
- move cards, mark documents submitted, and manage saved conversation threads.

Explicit create or update instructions run automatically. Ambiguous writes ask for confirmation, and deletes always require confirmation. Maxwell does not browse the web, submit job applications, send email, or compile PDF/DOCX output.

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
| `npm run db:push` | Push migrations to linked Supabase project |
| `npm run db:reset` | Reset local Supabase database |

## Auth

Email + password auth via Supabase. Enable the Email provider in your Supabase dashboard under Authentication → Providers. Register at `/signup` and sign in at `/login`.

If "Confirm email" is enabled, new users confirm via an emailed link that lands on `/auth/callback`; add `http://localhost:3000/auth/callback` to your redirect URLs in Supabase Auth settings. To allow instant sign-in during development, you can disable email confirmation.

## License

Private
