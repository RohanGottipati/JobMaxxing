# JobMax — Session Context / Handoff

Read this first. It captures project state, what's done, and what's next so a new
Claude session can continue without re-deriving everything.

## What this is

JobMax merges two projects into one product:

- **`web/`** — **JobMaxxing** (`RohanGottipati/JobMaxxing`): Next.js 16 + Supabase web app.
  The **landing + login front door**. Real hub table is `applications`
  (`job_applications` is a superseded legacy table).
- **`extension/`** — **JobTrack** (`zhao0524/JobTrack`): Chrome MV3 extension (vanilla JS,
  **no build step**). Captures jobs from LinkedIn/Workday/Greenhouse/Lever/Ashby and
  **displays** them in its Outlook-style dashboard (`options/`).

**Target flow:** extension popup → "Log in with JobMaxxing" opens the web login (there's
also an email/password form in the popup — user wanted **both**) → after login the extension
shows its dashboard with the tracked jobs.

## Status: Phase 1 (frontend merge) DONE ✅ — Phase 2 (auth + data) NEXT

Phase 1 stitched the two halves together with the auth navigation wired and every
Supabase-dependent bit stubbed behind `TODO(phase-2)` markers. Env is now filled in
(see below), so Phase 2 can begin.

## How to run

**Web app** (needs a dev server):
```bash
cd web
npm install        # already done
npm run dev        # http://localhost:3000
```

**Extension** (NO dev server — load the folder):
1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → select the **`extension/`** folder (the one with `manifest.json`),
   NOT the top-level `JobMax` folder.
3. After editing extension files, click the ↻ reload icon on the card and refresh open job tabs.

## Environment (filled in — verified working)

Connected to the user's **JobMaxxing** Supabase project (ref `lgsqantcimawupwxgyeg`).

| What | File | Notes |
|---|---|---|
| Web Supabase URL + key, Gemini key | `web/.env` | gitignored. Key is the new `sb_publishable_…` format (works with supabase-js ≥2.108). |
| Extension Supabase URL + key | `extension/config.local.js` | gitignored. Same URL/key as web. Public by design. |
| Extension web origin | `extension/config.app.js` | committed. `WEB_APP_ORIGIN` = `http://localhost:3000`. |

Credentials were verified live: `GET /rest/v1/applications` returns `200 []` (valid key, RLS active).
Do NOT re-add trailing slashes to the URL — they cause `//rest/v1` in the extension.

## Supabase MCP — registered, needs activation

`.mcp.json` (repo root, gitignored) has the **hosted HTTP** Supabase MCP:
`https://mcp.supabase.com/mcp?project_ref=lgsqantcimawupwxgyeg&features=…`

To use it in a new session: restart Claude Code so it loads `.mcp.json`, approve the
project MCP server when prompted ("trust"), and complete the **OAuth** login in the browser
on first tool use. It was added but is not active in the session that created it.

## ⚠️ Critical Phase 2 finding: the `applications` table collision

Both projects define `public.applications`, with **different schemas**:

- **JobMaxxing's `applications`** (what's actually in the connected DB): per-user hub —
  `role_title`, `company_name`, `job_description`, `status` (enum:
  saved/applied/screening/interview/offer/rejected/withdrawn), `date_applied`, `deadline`,
  `user_id`, RLS. Powers the board, AI matching, cover letters, resumes.
- **JobTrack's expected `applications`** (from its README/storage.js): flat, auth-less —
  `title`, `company`, `location`, `description`, `description_hash`, `season`, `source_host`,
  `status` (free text: applied/oa/interview/offer/rejected/ghosted), **no `user_id`**.

So the extension **cannot** write to the connected `applications` as-is. Phase 2 must decide:
map JobTrack's capture onto JobMaxxing's `applications` (title→role_title, company→company_name,
description→job_description, add columns `source_host`/`season`/`description_hash`, reconcile the
status vocab, require `user_id`), OR give the extension its own separate table. Recommended:
map onto JobMaxxing's `applications` so captured jobs flow into the web app's features.

## Phase 2 task list (grep `TODO(phase-2)` for exact seams)

1. **Real popup login** — `extension/src/auth.js` `signInWithPassword()` → wire to Supabase.
2. **Web → extension session hand-off** — `web/src/components/extension/extension-auth-bridge.tsx`
   already posts the session on auth change; it auto-activates now that env is set. The
   extension side (`extension/content/auth-bridge.js` → `background.js` `WEB_SESSION` → `auth.js`)
   is already wired. Verify end to end.
3. **Authenticated data calls** — `extension/src/supabase.js`: send the logged-in user's
   access token as `Bearer` instead of the anon/publishable key (seam is commented there).
4. **Data model** — resolve the `applications` collision above (migration + `extension/src/storage.js`
   field mapping). Use the Supabase MCP to inspect the live schema before changing it.

## Auth flow architecture (how the hand-off works)

```
popup "Log in with JobMaxxing"  → opens web /login
web app (after login) ─ ExtensionAuthBridge posts window.message {source:'jobmaxxing-auth', session}
  → content/auth-bridge.js (runs on localhost:3000) relays chrome.runtime {type:'WEB_SESSION', session}
    → background.js stores it via src/auth.js (chrome.storage.local key 'jm_session')
      → popup & options watch chrome.storage.onChanged → flip from login gate to real UI
```
Session message types live in `extension/src/messages.js`
(`GET_SESSION`/`SET_SESSION`/`SIGN_OUT`/`WEB_SESSION`).

## Verification done in Phase 1
- Extension JS files pass ES-module syntax checks; `manifest.json` valid.
- Web `tsc --noEmit`: only pre-existing `RouteContext` errors (Next build-generated types,
  absent until `next build`/`next dev`) — none in merged files.
- Live Supabase credential check passed.

## Not yet done
- No git commit has been made. `git init` ran; nothing is committed. Repo has no remote.
