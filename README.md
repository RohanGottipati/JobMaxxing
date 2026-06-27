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

## Project structure

```
src/
  app/                  # Next.js App Router pages
  components/           # UI and feature components
  lib/supabase/         # Supabase client helpers
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
| `npm run db:push` | Push migrations to linked Supabase project |
| `npm run db:reset` | Reset local Supabase database |

## Auth

Email magic-link auth is configured via Supabase. Enable Email provider in your Supabase dashboard under Authentication → Providers.

Add `http://localhost:3000/auth/callback` to your redirect URLs in Supabase Auth settings.

## License

Private
# JobMaxxing
