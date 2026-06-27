# Job Application Tracker MVP Build Spec

## 1. Product Overview

Build a simple job application tracking platform where a user can save, organize, and review their job applications.

The platform should let the user track each job they apply to, store the job description, save the resume and cover letter used, and update the application status over time.

This is the base product only. Do not build future AI features, browser extensions, analytics dashboards, automation, or resume scoring yet.

## 2. Core Goal

The product should answer this question:

> Can I quickly save every job I apply to and know exactly what I sent?

The MVP should be simple, reliable, and clean.

## 3. Tech Stack

Use the following stack unless the existing project already uses something else:

- Frontend: Next.js
- Language: TypeScript
- Styling: Tailwind CSS
- Database: Supabase Postgres
- Auth: Supabase Auth
- File Storage: Supabase Storage
- Backend/API: Next.js server actions or API routes
- Forms: React Hook Form or simple controlled forms
- Validation: Zod if needed

## 4. MVP Features

### 4.1 Authentication

Users should be able to:

- Sign up
- Log in
- Log out
- Only view their own job applications
- Only view their own uploaded documents

Use Supabase Auth.

Every database table should include a `user_id` connected to `auth.users.id`.

Enable Row Level Security on all user-owned tables.

---

### 4.2 Add Job Application

Users should be able to create a new job application with the following fields:

- Company name
- Job title
- Job URL
- Location
- Application date
- Status
- Job description
- Notes

The status should be one of:

- Saved
- Applied
- Interviewing
- Offer
- Rejected

Default status should be `Saved`.

The job description should be a large textarea where the user can paste the full job posting.

Notes should also be a textarea.

---

### 4.3 View Applications

Users should have an applications page that shows all saved applications.

Each application card or row should show:

- Company name
- Job title
- Status
- Location
- Application date
- Created date

The user should be able to:

- Search applications by company or job title
- Filter applications by status
- Click into an application detail page

---

### 4.4 Dashboard

Create a simple dashboard page that shows:

- Total number of applications
- Number of applications by status
- Recently added applications

Keep the dashboard simple. Do not build charts unless they are easy and lightweight.

---

### 4.5 Application Detail Page

Each application should have a detail page.

The detail page should show:

- Company name
- Job title
- Job URL
- Location
- Status
- Application date
- Full job description
- Notes
- Uploaded resume
- Uploaded cover letter
- Other uploaded documents if any

The user should be able to:

- Edit application details
- Update the status
- Delete the application
- Upload documents connected to the application
- View/download uploaded documents

---

### 4.6 Save Application Materials

Users should be able to attach documents to an application.

Supported document types:

- Resume
- Cover letter
- Other

Each document should store:

- Document type
- File name
- File URL or storage path
- Optional text content
- Upload date

Use Supabase Storage for file uploads.

Create a private Supabase Storage bucket called:

```text
application-documents
```

Files should be organized by user and application:

```text
/{user_id}/{application_id}/{filename}
```

Users should only be able to access files that belong to them.

---

### 4.7 Status History

Track status changes for each application.

Whenever the application status changes, insert a row into `status_history`.

Each status history item should store:

- Application ID
- User ID
- New status
- Optional note
- Created date

This allows the detail page to eventually show a timeline, but for the MVP it can simply show a basic status history list.

## 5. Pages / Routes

Use this route structure:

```text
/
```

Landing page or redirect page.

If the user is logged in, redirect to `/dashboard`.
If the user is not logged in, show a simple landing page with login/signup links.

```text
/login
```

Login page.

```text
/signup
```

Signup page.

```text
/dashboard
```

Main dashboard with summary stats and recent applications.

```text
/applications
```

List of all applications with search and status filter.

```text
/applications/new
```

Create new job application form.

```text
/applications/[id]
```

Application detail page.

```text
/applications/[id]/edit
```

Edit application form.

## 6. Database Schema

Use Supabase Postgres.

### 6.1 Application Status Type

Create an enum for application status.

```sql
create type application_status as enum (
  'Saved',
  'Applied',
  'Interviewing',
  'Offer',
  'Rejected'
);
```

---

### 6.2 Applications Table

```sql
create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  company text not null,
  job_title text not null,
  job_url text,
  location text,
  status application_status not null default 'Saved',
  application_date date,
  job_description text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Indexes:

```sql
create index applications_user_id_idx on applications(user_id);
create index applications_status_idx on applications(status);
create index applications_created_at_idx on applications(created_at desc);
```

---

### 6.3 Documents Table

```sql
create table documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  type text not null check (type in ('resume', 'cover_letter', 'other')),
  file_name text,
  file_path text,
  file_url text,
  text_content text,

  created_at timestamptz not null default now()
);
```

Indexes:

```sql
create index documents_user_id_idx on documents(user_id);
create index documents_application_id_idx on documents(application_id);
```

---

### 6.4 Status History Table

```sql
create table status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  status application_status not null,
  note text,

  created_at timestamptz not null default now()
);
```

Indexes:

```sql
create index status_history_user_id_idx on status_history(user_id);
create index status_history_application_id_idx on status_history(application_id);
create index status_history_created_at_idx on status_history(created_at desc);
```

## 7. Updated At Trigger

Add a trigger so `applications.updated_at` updates automatically.

```sql
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_applications_updated_at
before update on applications
for each row
execute function update_updated_at_column();
```

## 8. Row Level Security

Enable RLS on all tables.

```sql
alter table applications enable row level security;
alter table documents enable row level security;
alter table status_history enable row level security;
```

### 8.1 Applications RLS Policies

```sql
create policy "Users can view their own applications"
on applications
for select
using (auth.uid() = user_id);

create policy "Users can create their own applications"
on applications
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own applications"
on applications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own applications"
on applications
for delete
using (auth.uid() = user_id);
```

### 8.2 Documents RLS Policies

```sql
create policy "Users can view their own documents"
on documents
for select
using (auth.uid() = user_id);

create policy "Users can create their own documents"
on documents
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own documents"
on documents
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own documents"
on documents
for delete
using (auth.uid() = user_id);
```

### 8.3 Status History RLS Policies

```sql
create policy "Users can view their own status history"
on status_history
for select
using (auth.uid() = user_id);

create policy "Users can create their own status history"
on status_history
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own status history"
on status_history
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own status history"
on status_history
for delete
using (auth.uid() = user_id);
```

## 9. Supabase Storage

Create a private storage bucket:

```text
application-documents
```

File path format:

```text
{user_id}/{application_id}/{file_name}
```

Storage access rules should ensure users can only access files where the first folder in the path equals their authenticated user ID.

Example storage policy idea:

```sql
create policy "Users can upload their own application documents"
on storage.objects
for insert
with check (
  bucket_id = 'application-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can view their own application documents"
on storage.objects
for select
using (
  bucket_id = 'application-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update their own application documents"
on storage.objects
for update
using (
  bucket_id = 'application-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own application documents"
on storage.objects
for delete
using (
  bucket_id = 'application-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

## 10. Required Components

Suggested components:

```text
components/
  ApplicationCard.tsx
  ApplicationForm.tsx
  ApplicationStatusBadge.tsx
  DocumentUpload.tsx
  DocumentList.tsx
  DashboardStats.tsx
  StatusHistory.tsx
  Navbar.tsx
```

## 11. Suggested Folder Structure

```text
app/
  page.tsx
  login/
    page.tsx
  signup/
    page.tsx
  dashboard/
    page.tsx
  applications/
    page.tsx
    new/
      page.tsx
    [id]/
      page.tsx
      edit/
        page.tsx

components/
  ApplicationCard.tsx
  ApplicationForm.tsx
  ApplicationStatusBadge.tsx
  DashboardStats.tsx
  DocumentUpload.tsx
  DocumentList.tsx
  Navbar.tsx
  StatusHistory.tsx

lib/
  supabase/
    client.ts
    server.ts
  types/
    database.ts
  validations/
    application.ts
```

## 12. TypeScript Types

Create useful TypeScript types.

```ts
export type ApplicationStatus =
  | 'Saved'
  | 'Applied'
  | 'Interviewing'
  | 'Offer'
  | 'Rejected';

export type Application = {
  id: string;
  user_id: string;
  company: string;
  job_title: string;
  job_url?: string | null;
  location?: string | null;
  status: ApplicationStatus;
  application_date?: string | null;
  job_description?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentType = 'resume' | 'cover_letter' | 'other';

export type ApplicationDocument = {
  id: string;
  application_id: string;
  user_id: string;
  type: DocumentType;
  file_name?: string | null;
  file_path?: string | null;
  file_url?: string | null;
  text_content?: string | null;
  created_at: string;
};

export type StatusHistoryItem = {
  id: string;
  application_id: string;
  user_id: string;
  status: ApplicationStatus;
  note?: string | null;
  created_at: string;
};
```

## 13. Form Validation

Application form required fields:

- Company name
- Job title
- Status

Optional fields:

- Job URL
- Location
- Application date
- Job description
- Notes

Validation rules:

- Company name cannot be empty
- Job title cannot be empty
- Status must be one of the allowed status values
- Job URL should be a valid URL if provided
- Application date should be a valid date if provided

## 14. Main User Flows

### 14.1 Create Application Flow

1. User goes to `/applications/new`.
2. User fills in company, job title, URL, location, status, date, job description, and notes.
3. User submits the form.
4. Create a row in `applications`.
5. Create an initial row in `status_history` with the selected status.
6. Redirect user to `/applications/[id]`.

### 14.2 Update Application Flow

1. User goes to `/applications/[id]/edit`.
2. User updates application fields.
3. If status changed, insert a new row into `status_history`.
4. Update the `applications` row.
5. Redirect user to `/applications/[id]`.

### 14.3 Upload Document Flow

1. User goes to an application detail page.
2. User selects document type: resume, cover letter, or other.
3. User uploads a file.
4. Upload file to Supabase Storage under:
   ```text
   {user_id}/{application_id}/{file_name}
   ```
5. Insert a row into `documents`.
6. Show the uploaded document in the document list.

### 14.4 Delete Application Flow

1. User clicks delete on an application.
2. Confirm before deleting.
3. Delete the application row.
4. Related documents and status history rows should be deleted through cascade.
5. Also delete related files from Supabase Storage if possible.
6. Redirect to `/applications`.

## 15. UI Requirements

Keep the UI simple and clean.

Use:

- A top navigation bar
- A dashboard summary section
- Application cards or a table
- Status badges
- Clear form labels
- Large textareas for job description and notes
- Empty states when no applications exist
- Loading states for form submissions
- Error messages when actions fail

Suggested navigation:

```text
Dashboard
Applications
New Application
Logout
```

## 16. Status Badge Styling

Use different badge styles for each status.

Suggested labels:

```text
Saved
Applied
Interviewing
Offer
Rejected
```

Do not overcomplicate this. Simple Tailwind classes are fine.

## 17. Supabase Client Setup

Create a browser client for client components.

```ts
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Create a server client for server components/actions.

```ts
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore if called from a Server Component.
          }
        },
      },
    }
  );
}
```

## 18. Environment Variables

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Do not expose Supabase service role keys on the frontend.

## 19. Acceptance Criteria

The MVP is complete when:

- A user can sign up
- A user can log in
- A user can log out
- A logged-in user can create a job application
- A logged-in user can view only their own applications
- A logged-in user can search applications by company or job title
- A logged-in user can filter applications by status
- A logged-in user can view an application detail page
- A logged-in user can edit an application
- A logged-in user can delete an application
- A logged-in user can upload a resume, cover letter, or other document for an application
- Uploaded documents are connected to the correct application
- A logged-in user can view/download their own uploaded documents
- A logged-in user cannot access another user's applications or documents
- Status changes are saved to `status_history`
- The dashboard shows total applications, status counts, and recent applications

## 20. Do Not Build Yet

Do not build these features in the MVP:

- AI resume tailoring
- AI cover letter generation
- Resume/job description match scoring
- Chrome extension
- Email reminders
- Interview prep tools
- Advanced analytics
- Kanban board
- Public sharing
- Team accounts
- Job scraping
- Auto-importing from LinkedIn or Indeed

## 21. Build Order

Recommended implementation order:

1. Set up Supabase project
2. Create database schema
3. Add RLS policies
4. Create storage bucket and storage policies
5. Set up Next.js app
6. Set up Supabase auth
7. Build login/signup/logout
8. Build dashboard shell and navbar
9. Build applications list page
10. Build new application form
11. Build application detail page
12. Build edit application page
13. Build document upload
14. Build document list/download
15. Add status history insert logic
16. Add search and filter
17. Add loading, empty, and error states
18. Test RLS and user isolation

## 22. Notes for the AI Coding Agent

Prioritize correctness and simplicity.

Do not over-engineer the app.

Use clean reusable components, but avoid unnecessary abstractions.

Keep all user data private.

Make sure every Supabase query is scoped to the authenticated user.

Use server-side auth checks for protected pages.

Redirect unauthenticated users to `/login`.

Use simple Tailwind styling.

The first version should feel like a clean internal tool, not a complex SaaS product.
