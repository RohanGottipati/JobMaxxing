# JobMax

JobMax combines two projects into one product:

- **`web/`** — the **JobMaxxing** Next.js + Supabase web app. It is the **front door**:
  the marketing **landing page** and email/password **login** (Supabase Auth).
- **`extension/`** — the **JobTrack** Chrome extension (Manifest V3, vanilla JS, no build
  step). It **captures** job postings from LinkedIn / Workday / Greenhouse / Lever / Ashby
  and **displays** them in its Outlook-style dashboard.

## How the two fit together

```
 ┌────────────────────┐   "Log in with JobMaxxing"    ┌──────────────────────┐
 │  Extension popup   │ ────────────────────────────► │  web/ landing+login  │
 │  (login gate)      │                               │  (JobMaxxing)        │
 │                    │ ◄──── session (postMessage) ──│  after auth          │
 └─────────┬──────────┘        via auth-bridge        └──────────────────────┘
           │ logged in
           ▼
 ┌────────────────────┐
 │ Extension dashboard│  ← captured jobs are displayed here (JobTrack)
 └────────────────────┘
```

The extension popup offers **two** ways to log in:
1. **"Log in with JobMaxxing"** — opens the web app's `/login` page. After you sign in there,
   the web app hands the session back to the extension (via a content-script bridge).
2. **A login form in the popup** — sign in with email/password without leaving the popup.

Once authenticated, the extension shows its dashboard with the jobs you've tracked.

## Running it

### Web app
```bash
cd web
npm install
cp .env.example .env.local   # then fill in Supabase values (Phase 2)
npm run dev                  # http://localhost:3000
```

### Extension
1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select the `extension/` folder.
3. The popup opens in its logged-out view with both login options.

`extension/config.app.js` holds `WEB_APP_ORIGIN` (defaults to `http://localhost:3000`) — the web
app origin the login button opens and the auth bridge trusts. Secrets go in
`extension/config.local.js` (gitignored; copy from `config.example.js`).

## Phase 2 — pending env + Supabase MCP

The current state is the **frontend merge**: both halves live in one repo and the
login → dashboard navigation is wired. Everything that needs live Supabase is stubbed and
marked `TODO(phase-2)` in the code. Remaining work once env + the Supabase MCP are added:

- **Real login** — wire the popup email/password form and the web bridge to `supabase.auth`.
- **Web → extension token hand-off** — the web bridge reads `supabase.auth.getSession()` and
  posts it; the extension stores it and uses the **user access token** as the PostgREST `Bearer`
  (replacing the anon-only header in `extension/src/supabase.js`).
- **Unify the data model** — heads-up: **both projects define a `public.applications` table
  with different schemas**. JobTrack's is flat and auth-less (`title`, `company`, `description`,
  `season`, `source_host`, `description_hash`, no `user_id`); JobMaxxing's `applications` is the
  per-user hub (status enum, deadlines, package pointers, RLS) that powers the board, AI matching,
  cover letters, and resumes (`job_applications` there is a superseded legacy table). Phase 2 must
  reconcile these: map JobTrack's fields onto JobMaxxing's `applications` (title→role_title,
  company→company_name, description→job_description, …), add columns for `source_host` / `season` /
  `description_hash`, reconcile the free-text status with the status enum, and point the extension's
  PostgREST calls at the unified, RLS-protected table using the user's token.
