# JobMaxxing Remaining Implementation Plan

Last updated: 2026-08-03

This document is the durable implementation roadmap for every unfinished product phase. It is intentionally explicit about current state so future work does not mistake local, partial, or unverified code for a completed feature.

## Completion definition

A feature is complete only when all applicable items below are true:

- The user-facing flow is connected to navigation and the surrounding product journey.
- Server-side authentication and ownership authorization are enforced on every read and mutation.
- Shared Zod validation is used at trust boundaries, including AI output.
- Data persists in hosted Supabase with migrations, explicit grants, RLS, ownership policies, and required indexes.
- AI content is grounded in canonical profile evidence; unsupported claims are flagged and blocked from acceptance or submission.
- Initial loading, skeleton, empty, error, retry, permission, rate-limit, subscription-limit, success, and network-failure states exist where relevant.
- Mobile, tablet, laptop, large desktop, zoom, keyboard, focus, scrolling, modal, drawer, sticky, and overflow behavior are verified.
- Unit, integration, database/RLS, API, accessibility, responsive, end-to-end, and regression coverage exists in proportion to risk.
- Lint, TypeScript, unit tests, Playwright, production build, migration tests, Supabase advisors, and production health checks pass.
- Required environment variables and manual provider setup are documented.
- No fake production data, placeholder actions, disconnected buttons, or silent mocked success remains.

## Current foundation

### Phase 1 — completed and hosted

The following foundation is implemented and was previously verified against hosted Supabase:

- Supabase email authentication, password recovery, session handling, protected app layout, and persisted onboarding.
- Canonical career profile with preferences, provenance, verification, confidence, locks, metrics, technologies, and profile bullets.
- PDF, DOCX, and text resume import; deterministic parsing; optional Gemini parsing; confidence-aware review; duplicate resolution; and secure storage.
- Structured resume editor with resume-specific overrides, section and bullet ordering, visibility, templates, live preview, autosave, conflicts, undo/redo, checkpoints, restore, PDF/DOCX export, default resumes, duplication, submission locking, and deletion.
- RLS, authorization, explicit Data API grants, storage policies, audit records, migration tests, parsing tests, export tests, responsive public tests, production build, and hosted health verification.

Hosted Phase 1 migration:

- `supabase/migrations/20260803015653_phase_one_career_foundation.sql`

### Phase 2 — hosted core vertical slice implemented; closeout remains

The core Phase 2 data and product journey are implemented locally and the database portion is applied to hosted Supabase. This is not yet the same as declaring every Phase 2 completion gate finished.

Implemented and verified:

- Hosted migrations `supabase/migrations/20260803174231_phase_two_ai_career_workflows.sql` and `supabase/migrations/20260803184433_harden_phase_two_privileges.sql` add and harden private analysis, suggestion, match, tailoring, usage, entitlement, audit, RLS, grant, index, and transactional RPC support.
- Deterministic explainable resume scoring, six reviewer perspectives, immutable score history, optional validated Gemini augmentation, and grounded bullet suggestions integrated into the structured editor.
- Confidence-aware deterministic/optional-Gemini job parsing, source snapshots, correction UI, uncertain-field warnings, and explicit confirmation before matching.
- Re-analysis preserves previously confirmed corrections by default and presents per-field before/after proposals that users apply individually before reconfirming.
- Explainable job matching, evidence matrix, category scores, hard-conflict visibility, match history, and stale warnings for profile, resume, and job-analysis changes.
- Reviewable tailoring diffs, individual safe-change selection, locked-content protection, stale-source rejection, idempotent transactional application, and a separate application-specific resume version that never overwrites the master.
- Optional Gemini tailoring rewrites run in one validated batch over unlocked verified bullets. Every target receives isolated allowed facts/skills; unknown targets and unsupported facts, metrics, or skills remain visibly blocked and unselected while deterministic changes remain the fallback.
- Grounded cover-letter generation with tone and 150/200/300-word limits, deterministic fallback, evidence per paragraph, copy, persistence, history, paragraph regeneration, shorten/expand revisions, and editor/export handoff.
- Safe saved-job URL import for supported ATS/job hosts with HTTPS/host restrictions, DNS/IP SSRF checks, redirect revalidation, timeouts, response-size/content-type limits, JSON-LD extraction, sanitization, explicit review, and paste fallback guidance.
- A responsive `/applications/[id]/match` workspace joining job review, resume selection, matching, evidence, tailoring, and cover letters with loading, skeleton, empty, error, rate-limit, offline, consent, and success states.
- Server-enforced atomic daily AI limits using a database entitlement source and privacy-safe audit events.
- Hosted transactional database tests for grants, RLS, own-row access, cross-user denial, ownership constraints, JSON/range validation, atomic limits, unsupported-change rejection, stale sources, idempotent tailoring, and job confirmation.
- Hosted database lint and performance advisors pass. Security advisors have one manual Auth setting remaining: leaked-password protection.
- Local ESLint, TypeScript, 33 unit tests, and the Next.js production build pass as of this update.
- Railway production deployment `75739fc8-8fd0-4530-ae63-33fb3def8879` succeeded, `/api/health` returns HTTP 200 with Gemini configured, and the deployed public responsive/accessibility Playwright suite passes.

Still required before Phase 2 is complete:

- Add authenticated API/browser coverage for the implemented batch Gemini tailoring path, including provider failure and blocked-output presentation.
- Safe-group tailoring selection, cover-letter history, paragraph regeneration, and shorten/expand revisions are implemented locally and still need authenticated API/browser verification.
- Add Phase 2 route/API integration tests and authenticated Playwright coverage for job review, match, evidence, tailoring, and cover-letter flows. A workspace accessibility/scroll smoke test is added and discovered, but full authenticated execution needs dedicated `E2E_EMAIL` and `E2E_PASSWORD` credentials.
- Complete automated and manual accessibility, scrolling, compact-mobile, tablet, wide-screen, zoom, and reduced-motion verification for the new workspaces.
- Confirm optional `GEMINI_MODEL` in Railway if a non-default model is desired, then run authenticated production smoke tests with a dedicated test account.
- Enable Supabase Auth leaked-password protection manually in the hosted dashboard.

---

## Phase 2 — AI resume and application intelligence

### 2.1 AI bullet writing and rewriting

Current local work:

- Modes, grounded output schema, facts-used display, unsupported-claim display, confidence, accept, reject, edit, regenerate, resume-specific lock, and restore-original controls are implemented locally.

Remaining implementation:

1. Add API integration tests for authentication, ownership, invalid mode, locked canonical bullet, wrong-application resume, rate limit, unsupported metric, unsupported skill, and duplicate decision attempts.
2. Add browser tests for every action: generate, edit, accept, reject, regenerate, lock, unlock, restore, autosave, refresh persistence, provider failure, offline save, and submitted-resume read-only state.
3. Add clear consent guidance linking to profile settings when external AI consent is absent.
4. Confirm that accepting a suggestion updates only the selected resume override and never canonical profile text.
5. Add suggestion history/audit presentation so users can revisit rejected and accepted alternatives without cluttering the editor.
6. Verify all fourteen requested modes and document which modes use safe deterministic fallback when Gemini is unavailable.

Completion gate:

- AI cannot introduce an unsupported number, technology, skill, responsibility, scope, employer, credential, or achievement into an accepted resume change.

### 2.2 Explainable resume scoring

Current local work:

- Sixteen score categories, deterministic deductions, semantic augmentation, prioritized fixes, reviewer perspectives, and immutable score history exist locally.

Remaining implementation:

1. Validate each deterministic check against fixtures for missing contact information, invalid links, long/short bullets, repeated verbs, quantified percentage, duplicate content, reversed/invalid dates, sparse/dense resumes, empty sections, unsupported skills, technical depth, leadership evidence, and punctuation consistency.
2. Add page-count input from the export renderer rather than relying only on approximation.
3. Add explicit checks for unexplained gaps, excessive columns, essential images, and recognizable headings with documented limitations for structured resumes.
4. Add job-aware score mode that consumes a confirmed job analysis without replacing the separate job-match score.
5. Implement safe one-click fixes only for deterministic transformations; use navigation actions for profile facts.
6. Add score-history comparison, category deltas, and accessible trend text without implying causation from small samples.
7. Add empty/error/rate-limit/provider-fallback states and end-to-end tests.

Completion gate:

- Every point deduction has a problem, location, reason, point value, recommended fix, and valid action.

### 2.3 Multi-perspective resume review

Current local work:

- ATS, technical recruiter, hiring manager, senior engineer, startup recruiter, and nontechnical recruiter lenses exist locally.

Remaining implementation:

1. Verify each reviewer uses distinct criteria and cannot merely repeat generic advice.
2. Deduplicate semantically equivalent findings before aggregation.
3. Enforce priority caps so the user sees critical fixes, high-impact improvements, optional improvements, strengths, credibility concerns, missing evidence, and role-specific concerns in that order.
4. Add prompt-injection fixtures proving resume text cannot change reviewer instructions.
5. Add snapshot and accessibility tests for the reviewer panel.

### 2.4 Job-description parsing and review

Implemented and hosted:

- Saved descriptions are parsed into company, title, seniority, location, arrangement, responsibilities, skills, experience, education, authorization, compensation, benefits, category, deadline, and posting date.
- The application workspace shows per-field confidence, source snapshot, uncertain-field highlighting, warnings, array editors, compensation inputs, and explicit confirmation.
- Original source text is retained separately from confirmed structured values, and matching refuses unconfirmed analyses.
- Re-parsing no longer overwrites corrected confirmed fields: the confirmed values remain stored and a per-field proposed diff must be applied explicitly.
- Saved URLs from Greenhouse, Lever, Ashby, Workday, iCIMS, Workable, SmartRecruiters, LinkedIn, and Indeed can be imported through a restricted server fetcher with DNS/IP SSRF defenses, redirect/size/content-type limits, sanitization, and JSON-LD extraction. Providers that block server fetches fall back to paste/manual entry.

Remaining implementation:

1. Add paste/manual/import-source metadata and browser-extension source identifiers.
2. Expand adapter fixtures beyond the current URL-security/JSON-LD tests for Greenhouse, Lever, Ashby, Workday, LinkedIn, Indeed, plain text, malformed content, missing sections, salary ranges, remote/hybrid language, sponsorship conflicts, redirects, oversized streams, blocked hosts, and prompt injection.
3. Add API and browser tests for URL-provider failure, low-confidence review, re-analysis diff application, correction persistence, explicit confirmation, and stale source handling.

Completion gate:

- Low-confidence parsed fields are never silently confirmed or used as hard requirements.

### 2.5 Job-match scoring and evidence matrix

Implemented and hosted:

- Required/preferred skills, role, seniority, domain, education, location, arrangement, compensation, authorization, preferences, verified evidence, and negative conflicts are scored and persisted.
- The match dashboard shows the overall and category scores, strong/partial/missing evidence, concerns, recommendations, and the explicit apply-or-pause rationale.
- The responsive evidence matrix exposes requirement type, exact evidence, source, verification, confidence, strength, missing evidence, and suggested action.
- Match history and stale warnings react to canonical profile revision, job-analysis update time, and resume row version.

Remaining implementation:

1. Add related-skill taxonomy tests and avoid overstating equivalence between adjacent technologies.
2. Add user-behavior signals only after enough data exists, keep their weight small, document it, and never infer protected characteristics.
3. Expand tests proving uncertain parsed requirements remain unverified rather than mandatory.
4. Add route/API and authenticated browser tests for ownership, history, stale warnings, empty matrices, long matrices, and all hard-conflict states.

Completion gate:

- A score is never shown without its evidence and penalties, and hard conflicts are never hidden inside an aggregate number.

### 2.6 Job-specific resume tailoring

Implemented and hosted:

- Confirmed analysis, master resume, canonical profile, and persisted match evidence are loaded with ownership checks.
- Deterministic section, skill, and bullet reordering plus conservative rewrites/removal suggestions use existing visible evidence only.
- Optional Gemini rewrites are batched, schema-validated, target-isolated, grounded against verified bullet-scoped facts, and replaced by deterministic fallback on any provider or validation failure.
- Immutable runs preserve source versions, evidence snapshots, change diffs, defaults, and audit metadata.
- Every change renders as a before/after diff; unsupported changes are blocked and users accept/reject safe changes individually.
- Users can select or clear all safe changes or toggle safe groups by change type; blocked changes never enter the selection.
- Locked canonical and resume-specific bullets retain their text, visibility, and position.
- Applying selected changes calls an idempotent, concurrency-protected transactional RPC that rejects stale sources and creates a separate structured resume version.

Remaining implementation:

1. Browser-test batch provider success/failure, blocked-output presentation, the implemented evidence-requirement/facts-used links, and safe-group controls.
2. Redirect or offer a direct post-success action to the new editor while preserving the run history view.
3. Add route/API, authenticated browser, concurrency, accessibility, and mobile diff tests beyond the existing pure transformation, AI-merge, and hosted transactional tests.

Completion gate:

- A tailored resume is always a separate version, all changes are reviewable, locked content is untouched, and unsupported claims cannot be applied or submitted.

### 2.7 AI cover-letter generation

Implemented and hosted:

- Users select a structured resume, six requested tones, and a 150/200/300-word cap.
- Generation retrieves verified visible resume evidence, validates paragraph evidence IDs and wording, blocks unsupported claims, and falls back safely when Gemini is unavailable.
- Every generation is persisted as a new cover-letter version with the original job snapshot, evidence per paragraph, tone, length, model, and an empty unsupported-claims list.
- The workspace shows evidence per paragraph and supports full regenerate, paragraph regenerate, shorten, expand, copy, and editor/export handoff; every transformation creates a separate grounded version and submission uses the existing unsupported-claim guard.
- The workspace loads and switches among persisted generated-letter versions without losing tone, length, content, or evidence metadata.

Remaining implementation:

1. Make tone changes explicit in the revision history rather than relying only on the full regenerate action.
2. Add direct download/export controls in the workspace in addition to the existing editor handoff.
3. Add API/browser tests for paragraph transformations, word limits, evidence linkage, fabricated company facts, unsupported metrics, wrong-user access, provider failure, history, and submitted-letter locking.

Completion gate:

- Every generated paragraph exposes its supporting resume evidence, and the saved letter contains no unsupported factual claim.

### 2.8 Phase 2 database and deployment closeout

Completed:

- Both Phase 2 migrations are applied to linked hosted Supabase.
- Composite ownership, constraints, grants, RLS, foreign-key indexes, atomic limits, and RPC privileges were reviewed and hardened.
- `supabase/tests/phase_two_ai_workflows.sql` passed against hosted Supabase inside a rollback transaction.
- Database lint and performance advisors pass; the only security-advisor item is the Auth leaked-password dashboard setting.
- Local lint, TypeScript, unit tests, production build, and `git diff --check` form the pre-deployment gate.
- Linked migration history is synchronized through `20260803184433`, Railway deployment `75739fc8-8fd0-4530-ae63-33fb3def8879` is successful, the health endpoint returns 200 with Gemini configured, and public deployed Playwright checks pass.

Remaining:

1. Add route/API and authenticated E2E coverage for the core Phase 2 journey.
2. Enable hosted Auth leaked-password protection.
3. Test authentication, resume review, job parse/confirmation, match/evidence, tailoring, and cover letters on Railway with a dedicated non-production-data account.

---

## Phase 3 — application workflow

### 3.1 Saved jobs and richer application tracker

Data model changes:

- Expand application status into discovered, saved, preparing, applied, online assessment, recruiter screen, technical interview, behavioral interview, final round, offer, rejected, withdrawn, archived.
- Add application events/status history, notes, contacts, deadlines, follow-ups, interview events, compensation snapshots, reminders, rejection reasons, offer links, and job-source metadata.
- Preserve immutable job-description snapshots separately from editable parsed fields.
- Add composite indexes for user/status/position, user/deadline, user/follow-up, and cursor pagination.

Backend/API work:

- Transactional status changes that append history/activity records.
- Cursor-paginated list/search/filter endpoints.
- Reminder scheduling and idempotent notification jobs.
- Ownership checks for every nested resource.

UI work:

- Kanban, accessible table, and calendar views over the same data.
- Search, filters, sorting, saved view preferences, responsive cards, empty/error/loading states, and status-history timeline.
- Keyboard-accessible drag/drop with buttons as a non-drag alternative.

Tests:

- Status transitions, ordering, filters, snapshots, reminders, cross-user denial, long lists, mobile tables/cards, scrolling, and accessibility.

### 3.2 Job discovery

1. Choose legitimate job providers whose terms permit API use, attribution, retention, and deep links. Do not scrape or ship fake production jobs.
2. Implement provider adapters behind a shared service interface with normalized fields, source, source date, expiration, and deduplication key.
3. Add search, location, arrangement, role, seniority, technology, company, salary, authorization, age, match-score filters, sorting, cursor pagination, saved searches, and expiration handling.
4. Compute matches lazily/cached against the user’s profile; show strongest evidence and main missing requirement on cards.
5. Add save, apply, tailor, and source-link actions with transparent authentication boundaries.
6. Add provider failure isolation, timeouts, retries, quotas, observability, and contract tests.

### 3.3 Screening-answer library

Data model:

- Factual reusable answers with verification, sensitivity, explicit-autofill approval, dates, and source.
- Job-specific written answers linked to an application and never reused silently.
- Separate legal/demographic fields with autofill disabled by design.

UI/API:

- Categorized library, edit/history, approval controls, job-specific drafts, clear legal warnings, and extension-safe retrieval endpoints.
- Never guess work authorization, sponsorship, salary, legal status, or demographic answers.

### 3.4 Browser extension and application copilot

Architecture:

- Manifest V3 extension in a separate workspace package.
- Background service worker, content scripts, side panel/popup, secure platform API client, and minimal local storage.
- Separate adapters for Greenhouse, Lever, Ashby, Workday, iCIMS, Workable, SmartRecruiters, LinkedIn, and Indeed.
- Adapter contract: detect, extract job, detect fields, map approved data, preview, fill, and report confidence.

Security rules:

- Never submit applications.
- Never fill demographic/protected data.
- Never invent legal, authorization, sponsorship, or salary answers.
- Require preview and explicit approval for low-confidence mappings.
- Avoid retaining page content; send only scoped fields to the platform over authenticated HTTPS.

Testing:

- HTML fixture tests per adapter, selector-version tests, cross-origin/auth tests, preview/fill confidence tests, extension CSP audit, and manual browser matrix.

### 3.5 Notifications and reminders

1. Add notification preferences by event, channel, digest frequency, quiet hours, and timezone.
2. Add notification/reminder tables, idempotency keys, delivery attempts, provider message IDs, and privacy-safe errors.
3. Use hosted Supabase Cron/Queues or a Railway worker; do not require local Docker.
4. Support application deadlines, follow-ups, interviews, preparation, expiring jobs, incomplete applications, offer deadlines, roadmap/practice reminders, and usage limits.
5. Add in-app notification center first; add email only after provider configuration and unsubscribe compliance.

### 3.6 Phase 3 completion gate

- A job can travel from discovery/import through saved/preparing/applied stages with an immutable source snapshot, tailored package, reminders, and safe extension-assisted form filling without automated submission.

---

## Phase 4 — interview preparation

### 4.1 Behavioral story bank

Data model:

- Story, STAR fields, reflection, demonstrated skills, leadership principles, relevant companies, supported questions, linked profile evidence, metrics, confidence, versions, and practice history.
- Adaptations reference the underlying story and cannot alter source facts.

UI/API:

- Library, filters, story editor, evidence picker, question mapping, adaptations, practice history, and missing-evidence warnings.
- Templates for failure, conflict, leadership, ambiguity, deadlines, disagreement, feedback, mistakes, ownership, collaboration, influence, initiative, technical challenge, customer focus, and prioritization.

### 4.2 AI behavioral mock interviews

1. Session setup: company, role, category, difficulty, timer, text/voice mode.
2. Persist prompts, responses, transcript, follow-ups, rubric scores, model, timestamps, and story links.
3. Use story-bank retrieval only; never invent a new user story.
4. Score specificity, structure, ownership, clarity, relevance, result, reflection, conciseness, credibility, and communication.
5. Return strongest part, missing details, filler, weak wording, better structure, likely follow-up, improved outline, and relevant stories.
6. Add voice only with explicit microphone consent, accessible text fallback, transcript correction, and deletion controls.
7. Test prompt injection, invented stories, transcript ownership, timer accessibility, network loss, and session resume.

### 4.3 Company-specific preparation

1. Add company, interview-process version, stage, topic, question report, source URL/date, confidence, and expiration models.
2. Use licensed/allowed sources and prominently show dates for time-sensitive content.
3. Build company pages with overview, stages, coding/system-design/behavioral/domain topics, reported questions, difficulty, evaluation criteria, preparation plan, resume-specific likely questions, progress, and mock entry point.
4. Add stale-content warnings and source review workflow.

### 4.4 Coding practice

1. Add licensed/original problem library, topics, difficulty, company tags with source policy, attempts, solution history, notes, time, confidence, and review schedule.
2. Implement editor/runtime using a secure remote code-execution provider or isolated worker; never execute arbitrary code in the web process.
3. Add progressive AI hints, complexity review, edge-case review, and explicit full-answer request.
4. Implement spaced repetition with a documented scheduling algorithm.
5. Test sandbox limits, malicious code, timeouts, persistence, accessibility, mobile read-only mode, and hint progression.

### 4.5 System-design lessons

1. Create versioned lesson content for caching, load balancing, sharding, replication, CAP, queues, consistent hashing, rate limiting, CDNs, SQL/NoSQL, APIs, microservices, observability, authentication, search, events, and distributed transactions.
2. Each lesson includes accessible diagrams, explanations, examples, tradeoffs, mistakes, questions, knowledge checks, sources, version date, and progress.
3. Render diagrams with semantic descriptions and downloadable text alternatives.

### 4.6 System-design interview coach

1. Persist sessions and rubric stages: clarify, functional/nonfunctional requirements, scale, APIs, data, architecture, bottlenecks, scaling, reliability, security, tradeoffs.
2. Build accessible diagram canvas with keyboard-operable components/connections plus a structured text/tree alternative.
3. Add notes, voice discussion, AI follow-ups, replay, improved solution, and tradeoff analysis.
4. Score process and reasoning, not one exact architecture.
5. Test replay determinism, canvas accessibility, large diagrams, autosave/conflicts, voice fallback, and prompt injection.

### 4.7 Readiness scoring

- Combine practice recency, rubric dimensions, spaced-repetition confidence, and coverage while showing uncertainty and never treating readiness as a hiring prediction.

### 4.8 Phase 4 completion gate

- Users can build evidence-backed stories, practice behavioral/coding/system-design interviews, revisit transcripts and attempts, and receive grounded feedback without invented experience or a single “correct” design bias.

---

## Phase 5 — career development

### 5.1 Role-based roadmaps

1. Create versioned role definitions for all requested roles: new-grad, frontend, backend, full-stack, DevOps, SRE, cloud, mobile, data, ML, data science, security, QA, SDET, embedded, game, forward deployed, product, and solutions engineering.
2. Model ordered stages, skills, importance, explanations, resources, projects, estimated effort, checkpoints, and source/update date.
3. Add per-user selection, progress, confidence, evidence links, readiness estimate, and next action.
4. Keep resource links curated and periodically checked; never imply endorsements without a source.

### 5.2 Resume-to-roadmap gap analysis

1. Map canonical skills and verified experience/project/bullet evidence to roadmap skills.
2. Distinguish completed, partial, missing, and unverified.
3. Show exact resume/project/work evidence and confidence.
4. Rank one highest-value next action based on target role, job demand, prerequisites, evidence gap, and available time.
5. Add stale-analysis invalidation when profile or roadmap version changes.

### 5.3 Portfolio-project library

1. Create original project definitions by role, difficulty, technology, category, time, and demonstrated skills.
2. Include problem, functional/nonfunctional requirements, architecture guidance, milestones, stretch goals, technologies, tests, deployment, rubric, and sources.
3. Add per-user progress, milestone evidence, repository/demo links, notes, and completion review.
4. Generate READMEs and resume bullets only from actual completed milestones and user-provided facts.

### 5.4 Personalized project recommendations

1. Rank projects using target role, confirmed job gaps, roadmap gaps, existing overlap, time, preferred technologies, and career stage.
2. Explain the recommendation, prerequisites, estimated time, exact skills/evidence it can build, and overlap risks.
3. Avoid recommending duplicate portfolio work when a smaller extension to an existing project closes the gap.

### 5.5 Progress analytics

1. Build event-backed dashboards for resume score, applications, response/interview/offer rates, saved jobs, versions, tailoring, practice, coding, roadmap, gaps closed, and weekly activity.
2. Use clear denominators, minimum-sample warnings, date ranges, timezone handling, and no causal claims from correlations.
3. Add privacy-safe aggregate queries and indexes; avoid N+1 reads.

### 5.6 Phase 5 completion gate

- A selected role roadmap connects verified current evidence to a prioritized next skill or project, tracks progress, and feeds newly verified evidence back into the canonical career profile.

---

## Phase 6 — offers and platform maturity

### 6.1 Salary information and offer analysis

Data model:

- Offers, compensation components, equity grants, vesting events, refreshers, benefits, relocation, location, level, currency, tax assumptions, source, source date, confidence, and report type.
- Decimal/numeric currency fields; never floating-point money.

Calculations:

- First-year and four-year totals, annual vesting, cliffs, signing clawbacks, bonuses, refreshers, location adjustments, scenario assumptions, and currency conversion with dated rates.
- Clearly separate guaranteed, target, estimated, and excluded values.

UI/tests:

- Comparable offer table, scenario controls, assumptions, accessible charts/table fallback, stale-source warnings, and formula tests.

### 6.2 Offer negotiation support

1. Generate email, call script, counter wording, supporting evidence, breakdown, negotiable items, questions, walk-away considerations, and comparison from actual offer data only.
2. Require user review and never send communications automatically.
3. Avoid legal/tax claims; label assumptions and encourage professional advice where appropriate.
4. Add unsupported-number and wrong-offer authorization tests.

### 6.3 Cross-platform AI career copilot

1. Extend Maxwell with narrowly scoped tools: career profile, resume, saved job, job analysis, comparison, tailoring suggestions, cover letter, application status, interview history, story bank, roadmap, projects, and offers.
2. Retrieve only data required for the selected tool; never dump the entire database into a prompt.
3. Enforce tool-level auth, ownership, validation, idempotency, consent, usage, audit, locked content, and verified-fact policies.
4. Add contextual action cards with explicit confirmation for writes.
5. Add tool-contract, prompt-injection, unauthorized-resource, unsupported-claim, and confirmation-policy tests.

### 6.4 Subscription and centralized usage

1. Choose billing provider and define products/prices in one server-side entitlement source of truth.
2. Model customer, subscription, entitlement, usage ledger, billing events, trial, grace period, cancellation, and payment failure.
3. Verify signed webhooks with idempotency and replay protection.
4. Enforce resume tailoring, letters, reviews, AI messages, mocks, exports, imports, and extension actions server-side.
5. Build remaining usage, reset date, upgrade, billing history, management, cancellation, trial, failure, and grace-period UI.
6. Never duplicate price strings across pages; public pricing reads the same catalog.

### 6.5 Account controls and privacy

1. Add data export jobs producing a private, expiring archive.
2. Add self-service deletion for resumes, applications, uploads, interviews, and account.
3. Revoke sessions/connected providers before account deletion and document Supabase token behavior.
4. Add AI consent/disclosure, connected accounts, active sessions, security settings, and provider revocation.
5. Make deletion targets exact, confirmed, audited, recoverable where feasible, and storage-cleanup aware.
6. Add retention policy and privacy documentation without logging resume/application content unnecessarily.

### 6.6 Public resources and growth pages

1. Build server-rendered, useful resources for templates, examples, letters, interview questions, behavioral guides, system design, roadmaps, projects, salary, and career guides.
2. Use original/licensed content, structured metadata, canonical URLs, sitemap, update dates, and source citations.
3. Connect each page to a transparent product action: score, use template, practice, start roadmap, save project, compare, or generate.
4. Warn before authentication is required; preserve the intended post-login destination.
5. Add no-JavaScript meaningful content and accessibility/SEO regression tests.

### 6.7 Notifications maturity

- Add channel reliability, retries, dead-letter handling, unsubscribe compliance, digest batching, provider failover, and delivery analytics without storing message bodies longer than necessary.

### 6.8 Full accessibility audit

Route-by-route checklist:

- Meaningful server-rendered text; no zero-only counters or duplicate animated headings.
- Carousel and animated content accessible without motion; reduced-motion support.
- Icon labels, checkmark labels, focus visibility, heading hierarchy, landmark structure, table headers/captions, drag alternatives, dialog focus trap/return, dropdown ARIA, and keyboard paths.
- Contrast, 200%/400% zoom, screen-reader names, live regions, error association, and touch target size.
- Automated axe plus manual VoiceOver/NVDA-style checks for critical journeys.

### 6.9 Full scrolling and viewport audit

Test matrix:

- Widths: 320, 360, 390, 768, 1024, 1280, 1440, 1920.
- Short and tall heights; landscape; mobile keyboard; browser zoom; Safari dynamic viewport and safe areas.
- Every page, modal, drawer, dropdown, tooltip, nested scroller, sticky header/sidebar, fixed action bar, table, long form, preview, canvas, and bottom navigation.
- Verify no horizontal overflow, clipped content, hidden controls, fixed-height traps, sticky overlap, unreachable buttons, dropdowns outside viewport, or z-index conflicts.
- Add Playwright assertions for scroll reachability and screenshots for critical routes.

### 6.10 Loading/error/empty-state audit

- Inventory every data fetch and mutation.
- Require initial skeleton, empty state, typed error, retry, permission, rate-limit, plan-limit, offline/network state, and success confirmation.
- Add timeouts and cancellation for long AI requests; show stages/progress without pretending exact percentages.
- Prevent blank routes and endless spinners with error boundaries and watchdog states.

### 6.11 Security hardening

1. Enable Supabase leaked-password protection in the hosted Auth dashboard.
2. Audit all RLS policies, Data API grants, storage policies, views (`security_invoker`), functions, `SECURITY DEFINER`, search paths, RPC execute grants, and ownership indexes.
3. Add rate limits to public/auth/AI/import/export/extension endpoints.
4. Add SSRF protection, upload magic-byte validation, malware scanning strategy, content sanitization, CSP, security headers, CSRF/origin configuration, stable Server Action encryption key, and secret scanning.
5. Shorten sensitive-session exposure and add session revocation UI.
6. Run dependency audit, lockfile review, provider webhook verification, and penetration-style BOLA/IDOR tests.

### 6.12 Performance

1. Measure route/server timing, JS bundles, Core Web Vitals, database query counts, and AI latency before optimizing.
2. Add route-level code splitting for canvases/editors/charts/extension docs.
3. Optimize images/fonts, resume previews, PDF/DOCX generation, parsing, and list virtualization where measurement justifies it.
4. Replace client-side application filtering with indexed cursor queries at scale.
5. Eliminate N+1 reads, add composite/partial indexes based on actual queries, and inspect `EXPLAIN (ANALYZE, BUFFERS)` safely.
6. Add job queues for parsing/exports/AI tasks that exceed request timeouts and expose resumable status.
7. Use optimistic updates only for reversible operations with reliable rollback.

### 6.13 Observability

1. Add structured privacy-safe server logs and request correlation IDs.
2. Track failed imports, exports, AI calls, invalid AI output, job parsing, extension fill, auth, billing, slow requests, DB failures, client crashes, queue lag, and notification failures.
3. Never log raw resumes, job descriptions, screening answers, transcripts, offers, tokens, or keys by default.
4. Add alert thresholds, sampling, dashboards, runbooks, and retention limits.
5. Connect Railway/Supabase logs to the chosen observability provider only after a privacy review.

### 6.14 Comprehensive testing program

Required layers:

- Unit: parsing, scoring, matching, grounding, tailoring, calculations, scheduling, entitlement, adapter mapping.
- Integration/API: validation, auth, ownership, rate limits, provider fallbacks, idempotency, timeouts.
- Database: constraints, transactions, RLS, grants, storage, functions, migration forward compatibility.
- AI: schema validation, prompt injection, unsupported claims, locked facts, model failure, deterministic fallback.
- Extension: adapter fixtures, confidence, preview, no-submit, protected-field exclusion.
- End-to-end: every core journey from onboarding through offer negotiation.
- Accessibility: axe plus keyboard/focus/screen-reader-oriented assertions.
- Responsive/scrolling: viewport matrix, reachability, overflow, modal/drawer/table behavior.
- Performance: budgets for initial JS, critical routes, large lists, resume preview, exports, and AI status.
- Regression: account isolation, base-resume preservation, unsupported-claim submission blocking, and immutable application snapshots.

### 6.15 Phase 6 completion gate

- Offers, negotiation, copilot, billing, privacy, public content, accessibility, scrolling, security, performance, observability, and testing operate as one production system with transparent limitations and no unsafe automation.

---

## Recommended execution order from the current repository state

1. Close Phase 2 with richer import-source metadata and focused API/E2E/accessibility tests for the implemented URL import, re-analysis diffs, grounded batch tailoring, tailoring groups, and cover-letter revisions/history.
2. Enable Supabase leaked-password protection, deploy the verified revision to Railway, and perform authenticated production smoke tests.
3. Expand the application status/history model and tracker views.
4. Build screening answers and notification foundations.
5. Build the extension package and adapters against stable platform APIs.
6. Build story bank and behavioral mocks.
7. Build company preparation, coding practice, lessons, and system-design coach.
8. Build roadmaps, gap analysis, projects, recommendations, and analytics.
9. Build offers, negotiation, scoped copilot tools, billing, and privacy controls.
10. Publish public resources.
11. Complete full accessibility, scrolling, loading-state, security, performance, observability, and regression audits.

## Environment and hosted-service plan

Required now:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional Phase 2 external AI:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`

Expected later, provider-dependent:

- Stable `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` for multi-instance Railway deployments.
- Email notification provider credentials and verified sender/domain.
- Billing provider secret and signed-webhook secret.
- Voice/transcription provider credentials if voice is enabled.
- Job-data provider credentials with documented terms.
- Observability DSN/token configured server-side.
- Extension OAuth/client configuration and allowed origins.

Rules:

- Secrets remain server-only and are configured in Railway/Supabase provider settings, never `NEXT_PUBLIC_` or committed files.
- Hosted Supabase is the database/auth/storage platform; local Supabase Docker is not required.
- Migrations and linked-project metadata remain in the repository for reproducible hosted changes.

## Handoff checklist for every future implementation session

1. Read `AGENTS.md`, the relevant skills, this roadmap, recent migrations, and current `git status`.
2. Preserve the dirty worktree and unrelated user changes.
3. Read relevant Next.js 16 guides from `node_modules/next/dist/docs/` before changing framework code.
4. Inspect hosted/local migration synchronization before schema work.
5. Use the Supabase CLI to create migrations and explicit grants/RLS for every new public table.
6. Implement the smallest end-to-end vertical slice; do not stop at a UI mockup.
7. Run TypeScript and focused tests frequently.
8. Before hosted writes: review SQL, run local/static checks, and confirm exact migration scope.
9. After hosted writes: run transactional tests/advisors and confirm user data is unchanged.
10. Report files, schema, APIs, UI, tests, limitations, variables, setup, and exact test steps without claiming unfinished work is complete.
