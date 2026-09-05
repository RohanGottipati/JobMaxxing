export type DocumentationSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  steps?: string[];
  note?: string;
};

export type DocumentationArticle = {
  slug: string;
  title: string;
  description: string;
  category: "Start here" | "Workspace" | "Documents" | "Reference";
  readTime: string;
  sections: DocumentationSection[];
};

export const documentationArticles: DocumentationArticle[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    description: "Set up JobMaxxing and track your first application.",
    category: "Start here",
    readTime: "2 min",
    sections: [
      { id: "setup", title: "The three-step setup", steps: ["Add your name, target roles and optional work preferences.", "Import a resume, build one in JobMaxxing, or skip this step.", "Choose whether to enable AI-assisted features. Tracking works without AI consent."] },
      { id: "first-application", title: "Add an application", paragraphs: ["Company and role title are the only required fields. Add the job link, description and next action if you already have them. Dates, notes and submitted files can be added now or later.", "The Chrome extension is the faster option when you are already on a supported job posting."] },
      { id: "what-it-does", title: "What JobMaxxing does", paragraphs: ["JobMaxxing tracks applications and preserves the resume and cover letter attached to each one. It does not fill or submit applications, contact employers, or send emails."] },
    ],
  },
  {
    slug: "applications",
    title: "Applications",
    description: "Add roles, filter the list and keep the next step visible.",
    category: "Workspace",
    readTime: "4 min",
    sections: [
      { id: "add", title: "Add from the web app", steps: ["Select Add application in the sidebar.", "Enter the company and role title.", "Add the posting and next action if useful, then open the optional sections only when you need them.", "Save the application."] },
      { id: "find", title: "Find a role", paragraphs: ["Use All, Active pipeline and Closed above the application list. Search by company or title, and use the status filter when the list is long."] },
      { id: "details", title: "Work from the application", paragraphs: ["Select a role to open its Overview, Job post, Resume, Cover letter and Notes tabs. Edit changes the application record. Match opens job analysis, resume comparison, tailoring and cover-letter generation."] },
      { id: "status", title: "Statuses", paragraphs: ["The current statuses are Saved, Applied, Online Assessment, Interview, Final Round, Offer, Rejected and Withdrawn. Applied dates are set automatically by the extension when a saved role is moved to a later status."] },
    ],
  },
  {
    slug: "extension",
    title: "Chrome extension",
    description: "Capture a posting and send it to the same JobMaxxing account.",
    category: "Workspace",
    readTime: "3 min",
    sections: [
      { id: "supported", title: "Supported job boards", paragraphs: ["Automatic posting detection is included for LinkedIn, Workday, Greenhouse, Lever and Ashby. User-initiated capture can also recognize other pages with JobPosting structured data, and manual entry remains available when a page cannot be confirmed automatically."] },
      { id: "capture", title: "Capture a posting", steps: ["Use Chrome 114 or newer and select the JobMaxxing toolbar icon to open the side panel.", "Sign in with the same account as the web app; website and extension sessions are mirrored when possible.", "Open an individual job posting and select Grab this posting.", "Review the extracted company, role, description and dates.", "Optionally attach the exact PDF or DOCX files you submitted, then save."] },
      { id: "sync", title: "Web handoff", paragraphs: ["The extension saves application records through authenticated web API routes and sends submitted files to a user-scoped private Storage path. Open the saved role in the web app to edit details, run a match or manage documents. Duplicate job URLs and descriptions are checked before another record is created."], note: "The extension never contains a Gemini API key. Saving a description requests server-side parsing; the deterministic parser works without AI consent, while Gemini enrichment requires both server configuration and consent." },
    ],
  },
  {
    slug: "documents",
    title: "Resumes and cover letters",
    description: "Understand master resumes, tailored versions and submitted files.",
    category: "Documents",
    readTime: "4 min",
    sections: [
      { id: "navigation", title: "The Documents area", paragraphs: ["Documents is one sidebar destination. Use the Resumes and Cover letters tabs in the top bar to move between libraries."] },
      { id: "resumes", title: "Master and tailored resumes", paragraphs: ["A master resume is reusable and is not tied to one application. A tailored resume belongs to an application and can optionally start from a master. You can keep multiple masters and choose one default."] },
      { id: "submitted", title: "Submitted versions", paragraphs: ["Marking a tailored resume or cover letter submitted connects it to that application. Submitted records are locked so JobMaxxing keeps the exact text and file that were sent. Duplicate a locked document to keep editing."] },
      { id: "formats", title: "Editors and files", paragraphs: ["Structured resume, plain text and Markdown source are supported in their matching editors. PDF and DOCX attachments are private and limited to 10 MB."] },
    ],
  },
  {
    slug: "career-match",
    title: "Career match and tailoring",
    description: "Review job requirements before comparing or rewriting anything.",
    category: "Workspace",
    readTime: "5 min",
    sections: [
      { id: "job-review", title: "Confirm the job first", paragraphs: ["JobMaxxing parses the saved job description into requirements and confidence levels. Review and correct those fields before confirmation; unconfirmed analysis is not used for matching."] },
      { id: "match", title: "Read the match", paragraphs: ["The result includes an overall score, category scores, evidence, missing requirements and hard conflicts. The score is a comparison aid, not a hiring prediction."] },
      { id: "tailor", title: "Review every change", paragraphs: ["Tailoring creates a separate resume version. Changes appear as before-and-after diffs, unsupported claims stay blocked, and locked content is not changed. Nothing is submitted automatically."] },
      { id: "letters", title: "Generated cover letters", paragraphs: ["Generated letters are saved as versions and show the resume evidence used for each paragraph. Regeneration, shortening and expansion create another version rather than overwriting a submitted letter."] },
    ],
  },
  {
    slug: "career-profile",
    title: "Career profile",
    description: "Keep the experience and skills used by your documents and matches current.",
    category: "Workspace",
    readTime: "4 min",
    sections: [
      { id: "content", title: "What to add", paragraphs: ["Add experience, education, projects, skills, achievements, links and any context you want available while tailoring. Use specific outcomes and only include claims you can support."] },
      { id: "relationship", title: "How it is used", paragraphs: ["The profile supplies structured evidence for resume imports, matching, tailoring and Maxwell. Resume-specific edits stay on that resume; they do not silently rewrite the profile."] },
      { id: "clear", title: "Clearing the profile", paragraphs: ["Clear profile removes editable profile content after confirmation. Applications and documents are separate and are not deleted."], note: "Clearing profile content cannot be undone." },
    ],
  },
  {
    slug: "maxwell",
    title: "Maxwell",
    description: "Use the workspace assistant with application or document context.",
    category: "Workspace",
    readTime: "3 min",
    sections: [
      { id: "context", title: "Page context", paragraphs: ["Opening Maxwell from an application or document can carry that page in as removable context. Threads are saved so you can return to them later."] },
      { id: "actions", title: "What Maxwell can change", paragraphs: ["Maxwell can search your workspace, create or update applications and document source, move application statuses and mark supported documents submitted. Ambiguous changes ask for confirmation and deletes always require confirmation."] },
      { id: "limits", title: "What it cannot do", paragraphs: ["Maxwell does not browse the web, submit job applications, send email, or compile PDF and DOCX output."] },
    ],
  },
  {
    slug: "uploads-and-privacy",
    title: "Uploads, AI and privacy",
    description: "Know what is stored and what leaves the app.",
    category: "Reference",
    readTime: "3 min",
    sections: [
      { id: "files", title: "Private files", paragraphs: ["PDF and DOCX files are stored in a private bucket under your user ID. Previews stream through authenticated app routes rather than permanent public URLs."] },
      { id: "ai", title: "AI processing", paragraphs: ["Gemini is called only from server routes and only after consent. Deterministic parsing, scoring and fallback transformations remain available without sending career text to Gemini; Maxwell requires Gemini to be configured."] },
      { id: "extension-data", title: "Extension storage", paragraphs: ["The Chrome extension stores its Supabase session, display details, recent-application index and local preferences in Chrome local storage. It reads job-page content for capture only after you select Grab this posting."] },
    ],
  },
];

export function getDocumentationArticle(slug: string) {
  return documentationArticles.find((article) => article.slug === slug) ?? null;
}
