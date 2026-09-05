# Product and UX map

Updated: September 4, 2026

## Product boundary

JobMaxxing is a private application tracker and document workspace. It records roles, job-post snapshots, next actions and the files used for each application. It does not submit employer forms, send email or contact recruiters.

The Chrome extension is a Manifest V3 capture client for the same account and API. It opens in Chrome's side panel and is not a separate source of truth.

## Primary user flow

1. **Set up** — Add basic profile details and target roles, optionally import a resume, and choose whether to enable AI-assisted features.
2. **Capture** — Add an application in the web app or capture the current posting with the extension. Only company and role title are required in the web form.
3. **Track** — Use the Applications list to search or filter All, Active pipeline and Closed roles. Select a role to see its Overview, Job post, Resume, Cover letter and Notes.
4. **Prepare** — Open Match to confirm parsed job requirements, compare a resume, review tailoring changes or create a grounded cover letter.
5. **Preserve** — Attach the final PDF or DOCX and mark the chosen tailored resume or cover letter submitted. Submitted records are locked.

Public, indexable product information lives at `/`, `/extension` and `/privacy`. Authentication, onboarding, workspace, print and in-app Help routes are not intended for search indexing.

## Navigation

The global sidebar contains only destinations used throughout the product:

- **Home** — recent applications, deadlines and compact pipeline counts
- **Applications** — capture, search, filter and role details
- **Documents** — reusable resumes and cover letters
- **Maxwell** — assistant threads and workspace-aware actions

Profile and Help live in the account menu. Application subviews live inside the selected application instead of the global sidebar.

## Applications

The application workspace uses a list-and-detail layout on large screens and a list-then-detail flow on small screens.

- Search and status filters stay with the list.
- Scope controls are All, Active pipeline and Closed.
- Adding an application shows company, title, status, job link, description and next action first.
- Dates, location, referral, notes and submitted files use progressive disclosure.
- Match and Edit are explicit actions; selecting a tab does not mutate data.

Current statuses: Saved, Applied, Online Assessment, Interview, Final Round, Offer, Rejected and Withdrawn.

## Documents

Documents are displayed as compact rows because users normally scan titles, linked applications, state and update date before opening a file.

- A master resume is reusable and independent of an application.
- A tailored resume belongs to one application and may reference a master resume.
- Every cover letter belongs to one application.
- Structured, plain-text and Markdown source follow their matching editor flows.
- A submitted tailored resume or cover letter is locked; duplicate it to continue editing.

Private file previews stream through authenticated application routes. The browser does not receive a permanent public Storage URL.

## Chrome extension

- Chrome 114 or newer is required because the interface uses the Side Panel API.
- LinkedIn, Workday, Greenhouse, Lever and Ashby include automatic posting detection. User-initiated capture can also recognize pages that expose `JobPosting` structured data; manual entry remains available when automatic extraction cannot confirm a posting.
- The extension and website mirror sign-in and sign-out state for the configured web origin. The extension also keeps its session, recent-application index and local preferences in Chrome local storage.
- Every captured field remains editable before save. The extension does not autofill or submit employer forms.
- PDF and DOCX application files are limited to 10 MB each and are uploaded to the signed-in user's private Storage path.
- Saving a description requests server-side parsing. Deterministic parsing works without external AI consent; Gemini enrichment runs only when the server is configured and the user has opted in.

## AI-assisted features

External AI processing is optional and consent-gated. Gemini credentials exist only on the server. Deterministic analysis, matching and fallback generation remain local to the application server and do not send career text to Gemini.

- Job analysis requires user review and confirmation before matching.
- Match scores show evidence and conflicts and are not hiring predictions.
- Tailoring creates a separate resume version and exposes changes before they are applied.
- Unsupported claims are blocked.
- Generated cover letters preserve evidence per paragraph and version history.
- Maxwell can search and modify supported workspace records, but it cannot browse the web, submit applications or send email.

## Responsive and accessibility expectations

- Support 320 px through wide desktop without root overflow.
- Keep all controls keyboard reachable and visibly focused.
- Use real headings, labels, tab roles and navigation landmarks.
- Preserve a non-drag path for any drag-and-drop interaction.
- Do not hide essential actions behind hover-only UI.
- Keep loading, empty, error, locked and offline states explicit.
