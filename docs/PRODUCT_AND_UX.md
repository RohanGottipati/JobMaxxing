# Product and UX map

Updated: September 4, 2026

## Product boundary

JobMaxxing is a private application tracker and document workspace. It records roles, job-post snapshots, next actions and the files used for each application. It does not submit employer forms, send email or contact recruiters.

The Chrome extension is a capture client for the same account and API. It is not a separate source of truth.

## Primary user flow

1. **Set up** — Add basic profile details and target roles, optionally import a resume, and choose whether to enable AI-assisted features.
2. **Capture** — Add an application in the web app or capture the current posting with the extension. Only company and role title are required in the web form.
3. **Track** — Use the Applications list to search or filter All, Active pipeline and Closed roles. Select a role to see its Overview, Job post, Resume, Cover letter and Notes.
4. **Prepare** — Open Match to confirm parsed job requirements, compare a resume, review tailoring changes or create a grounded cover letter.
5. **Preserve** — Attach the final PDF or DOCX and mark the chosen tailored resume or cover letter submitted. Submitted records are locked.

## Navigation

The global sidebar contains only destinations used throughout the product:

- **Home** — recent applications, deadlines and compact pipeline counts
- **Applications** — capture, search, filter and role details
- **Documents** — one area with top-level tabs for Resumes, Cover letters and LaTeX
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
- Structured, plain-text, Markdown and LaTeX source follow their matching editor flows.
- A submitted tailored resume or cover letter is locked; duplicate it to continue editing.

## LaTeX and Overleaf

The LaTeX landing page lists existing projects first. Creation opens only after the user selects New project.

1. Choose master resume, tailored resume or cover letter.
2. Select a template, upload a `.tex` file or paste source.
3. Create the JobMaxxing document.
4. Open a packaged copy in Overleaf. This is a one-way copy, not live sync.
5. Compile in Overleaf and attach the final file back to JobMaxxing.

## AI-assisted features

AI processing is optional and consent-gated. Gemini credentials exist only on the server.

- Job analysis requires user review and confirmation before matching.
- Match scores show evidence and conflicts and are not hiring predictions.
- Tailoring creates a separate resume version and exposes changes before they are applied.
- Unsupported claims are blocked.
- Generated cover letters preserve evidence per paragraph and version history.
- Maxwell can search and modify supported workspace records, but it cannot browse the web, submit applications, send email or compile files.

## Responsive and accessibility expectations

- Support 320 px through wide desktop without root overflow.
- Keep all controls keyboard reachable and visibly focused.
- Use real headings, labels, tab roles and navigation landmarks.
- Preserve a non-drag path for any drag-and-drop interaction.
- Do not hide essential actions behind hover-only UI.
- Keep loading, empty, error, locked and offline states explicit.
