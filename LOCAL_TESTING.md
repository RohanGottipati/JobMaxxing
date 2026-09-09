# Local Testing Guide — Web App

How to run the JobMaxxing web app against `localhost`, what to flip to point at
local, and what to flip **back** before you deploy.

Extension side of the same workflow: [`../extension/LOCAL_TESTING.md`](../extension/LOCAL_TESTING.md).

---

## TL;DR — the one thing that toggles

| File | Local value | Deployed value |
|------|-------------|----------------|
| `web/.env` → `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://job-maxxing.vercel.app` |

`.env` already carries the reminder:

```
# LOCAL TESTING — revert to https://job-maxxing.vercel.app before deploying
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Good news:** `.env` is gitignored (`.gitignore` ignores `.env*` except
> `.env.example`), so this value **never gets pushed**. `git push` is safe. The
> real risk is the **deployment**, not the commit — see [§4](#4-before-you-deploy).

---

## 1. Prerequisites

- Node.js ≥ 22.3
- The Supabase project already linked (same hosted project is used for local and
  prod — you are not running a local Postgres unless you deliberately do).
- `web/.env` present (copy from `.env.example` if missing).

Required env keys:

```
NEXT_PUBLIC_SUPABASE_URL=…              # hosted Supabase project
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=…  # public key, safe in client
NEXT_PUBLIC_APP_URL=http://localhost:3000   # ← local value
GEMINI_API_KEY=…                        # optional, enables Maxwell/AI
# NEXT_PUBLIC_COOKIE_DOMAIN=…           # leave UNSET locally (see §3)
```

---

## 2. Run it locally

```bash
npm install         # first time; runs postinstall worker copy
npm run db:push     # only if you pulled new supabase/migrations
npm run dev         # http://localhost:3000
```

Then open http://localhost:3000.

Test commands:

```bash
npm test            # unit tests (node --test)
npm run test:e2e    # Playwright e2e (needs E2E_EMAIL / E2E_PASSWORD)
```

---

## 3. Why `NEXT_PUBLIC_APP_URL` matters (don't skip)

This single var drives two things, which is why it must be correct per
environment:

1. **Canonical URLs / metadata / sitemap** — `src/lib/site.ts` falls back to
   `https://job-maxxing.vercel.app` if unset.
2. **Auth cookie domain** — `src/lib/supabase/cookie-options.ts`
   (`resolveCookieDomain`) derives the cookie scope from it:
   - `http://localhost:3000` → cookie stays **host-only** (correct for local).
   - `https://job-maxxing.vercel.app` → cookie scoped to `job-maxxing.vercel.app`
     so the app host and its subdomains share one session.

If you leave the deployed value while running locally, the auth cookie is scoped
to the wrong domain and sign-in / session refresh misbehaves — and the extension
can't mirror the session. **Keep `NEXT_PUBLIC_COOKIE_DOMAIN` unset locally.**

### Supabase Auth redirect URLs
For email-confirmation sign-in locally, make sure the Supabase Auth settings
include `http://localhost:3000/auth/callback` in the allowed redirect URLs (or
disable email confirmation for dev).

---

## 4. Before you deploy

Deployment env vars live in the **hosting platform dashboard** (Vercel/Railway),
not in the pushed code — so setting them there is the real switch-back step:

- [ ] `NEXT_PUBLIC_APP_URL` = `https://job-maxxing.vercel.app` (the production origin).
- [ ] `NEXT_PUBLIC_COOKIE_DOMAIN` set (or confirm derivation) so the app host and
      its subdomains share the session.
- [ ] Supabase Auth redirect URLs include the production `/auth/callback`.
- [ ] Any new `supabase/migrations` applied to the linked project (`npm run db:push`).
- [ ] `npm run build` succeeds and `npm test` passes.

### Before you push (git)
Because `.env` is gitignored, the localhost value won't leak into git. Just
sanity-check you didn't accidentally hardcode a URL in committed source:

```bash
git diff --cached | grep -n "localhost:3000" || echo "clean"
```

---

## 5. End-to-end with the extension

To test the full capture flow locally, run this app on `localhost:3000` and point
the extension at it — see [`../extension/LOCAL_TESTING.md`](../extension/LOCAL_TESTING.md)
(set the extension's `APP_URL` to `http://localhost:3000`, load unpacked, sign in
with the same account, capture a job, and confirm it lands on `/applications`).
