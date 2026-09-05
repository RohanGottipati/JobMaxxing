# Remaining implementation plan

Updated: September 4, 2026

This file tracks unfinished work in the current product. Implemented behavior and the intended user flow are documented in [PRODUCT_AND_UX.md](./PRODUCT_AND_UX.md).

## Current product state

Implemented in the repository:

- Supabase email authentication, password recovery, protected routes and persisted three-step onboarding
- Career profile, preferences and private document storage
- PDF, DOCX and text resume import with deterministic parsing and optional Gemini assistance
- Structured resume editing, checkpoints, restore, PDF/DOCX export, defaults, duplication and submission locks
- Application capture from the web app and Chrome extension
- Search, status filters, active/closed scopes and list-detail application navigation
- Submitted resume and cover-letter packages attached to applications
- Confirmed job analysis, explainable matching, evidence-based tailoring and grounded cover-letter generation
- Maxwell threads, page context, confirmation policy and supported workspace actions
- RLS, storage policies, validation, AI usage limits, migration tests, unit tests and responsive Playwright coverage
- Public product, extension and privacy pages with canonical/social metadata, generated share images, robots rules, a sitemap and a web manifest

## Required closeout work

### Authenticated browser coverage

- Run the complete Playwright suite with dedicated `E2E_EMAIL` and `E2E_PASSWORD` credentials.
- Add end-to-end coverage for application search, scope tabs, the simplified add form and local application-detail tabs.
- Add browser coverage for Gemini success, provider failure, unsupported-output blocking and consent-disabled states.
- Cover cover-letter history, paragraph regeneration, shorten/expand and submission locking.

### Accessibility and responsive verification

- Run automated accessibility checks on every authenticated route after the navigation simplification.
- Manually verify keyboard-only navigation, 200% zoom, reduced motion, 320 px mobile, tablet and wide desktop.
- Confirm long company names, role names, document titles, job descriptions and evidence matrices wrap or scroll without hiding actions.

### Database and production checks

- Run `supabase/tests/phase_one_foundation.sql` and `supabase/tests/phase_two_ai_workflows.sql` in a rollback transaction.
- Run Supabase security and performance advisors.
- Enable leaked-password protection in Supabase Auth.
- Verify `/api/health`, sign-up, password recovery, extension capture and one complete application/document flow on the production deployment.
- Configure and verify the production DNS origin before submitting the sitemap or packaging the extension; confirm canonical, Open Graph, robots and sitemap URLs use that origin.

## Near-term product work

- Replace synthetic application activity with a persisted status and action event log before reintroducing an Activity tab.
- Add cursor pagination and saved filters when real application volume makes them necessary.
- Add application contacts, interview events and reminders as focused workflows instead of adding more fields to the main application form.
- Add direct export controls to the career-match cover-letter workspace.
- Add score-history comparison with accessible change summaries.
- Expand job-import fixtures for supported ATS providers and their failure modes.
- Add extension packaging/release automation; keep the documented Chrome Web Store checklist current for every release.

## Explicit non-goals

- Automatically submitting employer application forms
- Guessing legal, demographic, work-authorization, sponsorship or salary answers
- Sending recruiter email from Maxwell
- Scraping job sites without an approved provider contract or user-initiated page capture
- Editing a submitted document in place
- Treating a match score as a hiring prediction

## Release gate

Before calling a release complete:

1. `npm run lint`, `npm test` and `npm run build` pass in the web repository.
2. `npm test` passes in the extension repository.
3. Public and authenticated Playwright suites pass at supported viewport sizes.
4. Migration tests and Supabase advisors pass.
5. Production health, authentication, capture, document and AI-consent smoke tests pass.
6. README files, in-app Help and [PRODUCT_AND_UX.md](./PRODUCT_AND_UX.md) match shipped behavior.
7. Public metadata validates, the sitemap contains only public canonical routes, private routes emit `noindex`, and extension store copy/privacy disclosures match the packaged manifest.
