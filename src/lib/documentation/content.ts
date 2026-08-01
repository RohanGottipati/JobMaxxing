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
    description: "Set up your workspace and build a dependable job-search workflow.",
    category: "Start here",
    readTime: "4 min",
    sections: [
      { id: "first-steps", title: "Your first three steps", steps: ["Complete the Personal Info, Experience, Education, and Skills areas of your career profile.", "Add an application with its status, deadline, job description, and next action.", "Create or paste a master resume, then make an application-specific version when you are ready to apply."] },
      { id: "daily-rhythm", title: "A useful daily rhythm", paragraphs: ["Open Home first. It combines active pipeline numbers, upcoming deadlines, recent applications, profile progress, and document counts.", "Update a role’s stage as soon as it changes and keep Next action specific, such as “Email recruiter on Tuesday” rather than “Follow up.”"] },
      { id: "privacy", title: "Your data and files", paragraphs: ["Your profile, applications, and document records are scoped to your account. PDF and DOCX files are stored privately and opened with links that expire after five minutes."], note: "Never share a signed document URL as a permanent link. It is intentionally short-lived." },
    ],
  },
  {
    slug: "dashboard",
    title: "Home dashboard",
    description: "Understand the metrics, deadlines, and shortcuts on Home.",
    category: "Workspace",
    readTime: "3 min",
    sections: [
      { id: "metrics", title: "Pipeline metrics", paragraphs: ["Applications counts every tracked role. Active pipeline includes Saved through Final Round, while Offers and Interviews surface the most important outcomes separately.", "Package completion measures applications that have both a submitted resume version and submitted cover letter."] },
      { id: "attention", title: "What needs attention", paragraphs: ["Upcoming deadlines are ordered by date. Recent applications are ordered by their latest update, so the work you just touched stays close at hand."] },
      { id: "progress", title: "Profile and document progress", paragraphs: ["Career profile completion checks the major content areas, while Document library links show how many master, tailored, and cover-letter records you have saved."] },
    ],
  },
  {
    slug: "applications",
    title: "Applications and pipeline",
    description: "Capture roles, manage stages, and keep follow-ups visible.",
    category: "Workspace",
    readTime: "5 min",
    sections: [
      { id: "capture", title: "Capture the opportunity", steps: ["Add company and role names.", "Save the source URL, location, deadline, and application date.", "Paste the job description before the listing disappears.", "Record a concrete next action and referral contact when relevant."] },
      { id: "stages", title: "Move through stages", paragraphs: ["The board follows Saved, Applied, Online Assessment, Interview, Final Round, Offer, Rejected, and Withdrawn. Drag a card to update its status, or use the edit form when you also need to change details."] },
      { id: "details", title: "Application details", paragraphs: ["Open a card for a quick overview and document package. The full page includes notes, role information, dates, and the exact resume and cover letter associated with the application."] },
    ],
  },
  {
    slug: "career-profile",
    title: "Career profile",
    description: "Build the source of truth behind your application materials.",
    category: "Workspace",
    readTime: "6 min",
    sections: [
      { id: "what-to-add", title: "What to add", paragraphs: ["Include personal information, a headline, links, experience, education, projects, skills, achievements, and useful additional context. Write naturally and focus on what you did and the outcome."] },
      { id: "quality", title: "Make entries useful", steps: ["Use specific role and organization names.", "Describe ownership, scope, tools, and measurable impact.", "Keep project links and technology lists current.", "Add skills you would be comfortable discussing in an interview."] },
      { id: "saving", title: "Saving and clearing", paragraphs: ["Profile sections are edited together and saved as one career profile. Clearing the profile removes its editable content and requires a confirmation; it does not delete applications or documents."], note: "Review all sections before using Clear profile. The action cannot be undone." },
    ],
  },
  {
    slug: "master-resumes",
    title: "Master resumes",
    description: "Maintain reusable source resumes for different career directions.",
    category: "Documents",
    readTime: "4 min",
    sections: [
      { id: "purpose", title: "What a master resume is", paragraphs: ["A master resume is independent of any one application. It can be broad and detailed, giving you a reliable source when you create tailored versions."] },
      { id: "default", title: "Choose a default", paragraphs: ["One master resume can be the default. New tailored resumes preselect it, but you can choose another master or no master at all."] },
      { id: "files", title: "Text and files", paragraphs: ["You can keep editable text, attach a PDF or DOCX, or use both. Attachments are optional, private, and limited to 10 MB."] },
    ],
  },
  {
    slug: "tailored-resumes",
    title: "Tailored resume versions",
    description: "Create and preserve the resume used for each application.",
    category: "Documents",
    readTime: "5 min",
    sections: [
      { id: "create", title: "Create a tailored version", steps: ["Choose the application.", "Optionally choose the master resume it is based on.", "Give the version a descriptive title.", "Add text and attach the final PDF or DOCX when ready."] },
      { id: "submit", title: "Mark the submitted version", paragraphs: ["Marking a resume submitted connects it to the application package. Only one resume version can be submitted for an application at a time."] },
      { id: "locked", title: "Why submitted versions are locked", paragraphs: ["A submitted version is evidence of exactly what you sent. Its title, text, base reference, and file cannot be changed while submitted. Duplicate it to continue editing without rewriting history."], note: "Submitted versions cannot be deleted. Submit a different version first if you need to replace the package document." },
    ],
  },
  {
    slug: "cover-letters",
    title: "Cover letters",
    description: "Organize application-specific letters and submitted versions.",
    category: "Documents",
    readTime: "4 min",
    sections: [
      { id: "linked", title: "Always linked to an application", paragraphs: ["Every cover letter belongs to a tracked application. This keeps the role, company, job description snapshot, and final letter together."] },
      { id: "versions", title: "Use versions intentionally", paragraphs: ["Create or duplicate letters as the role evolves. Clear titles make it easier to distinguish an early draft from a recruiter-ready version."] },
      { id: "submission", title: "Submission rules", paragraphs: ["Only one cover letter is submitted per application. Submitted letters are locked and preserved; duplicate one to make another editable version."] },
    ],
  },
  {
    slug: "uploads-and-privacy",
    title: "Uploads and privacy",
    description: "Understand supported files, secure previews, and replacement behavior.",
    category: "Reference",
    readTime: "3 min",
    sections: [
      { id: "supported", title: "Supported files", paragraphs: ["JobMaxxing accepts PDF and DOCX attachments up to 10 MB. PDFs can be previewed in the browser; DOCX files are downloaded and opened in your document editor."] },
      { id: "private", title: "Private storage", paragraphs: ["Files are stored in a private bucket under a path scoped to your user ID. Database and Storage policies prevent other signed-in users from reading or deleting them."] },
      { id: "replace", title: "Replace or remove", paragraphs: ["Replacing a file uploads a new unique object, updates the document record, then removes the superseded object. The app does not overwrite shared paths."], note: "A preview or download link expires after five minutes. Refresh the document page to generate another." },
    ],
  },
  {
    slug: "faq",
    title: "Frequently asked questions",
    description: "Quick answers about documents, stages, and account behavior.",
    category: "Reference",
    readTime: "3 min",
    sections: [
      { id: "delete-application", title: "What happens when I delete an application?", paragraphs: ["The application and its application-specific resume versions and cover letters are removed. Reusable master resumes remain."] },
      { id: "multiple-masters", title: "Can I keep multiple master resumes?", paragraphs: ["Yes. Keep different masters for different career directions and choose one default for new tailored versions."] },
      { id: "missing-file", title: "Do documents need an uploaded file?", paragraphs: ["No. Text-only documents are supported, and file-only documents are supported. Keeping both gives you an editable reference and the exact formatted attachment."] },
      { id: "profile-delete", title: "Does clearing my profile delete applications?", paragraphs: ["No. It clears career-profile sections only. Applications, resumes, and cover letters are separate records."] },
    ],
  },
];

export function getDocumentationArticle(slug: string) {
  return documentationArticles.find((article) => article.slug === slug) ?? null;
}
