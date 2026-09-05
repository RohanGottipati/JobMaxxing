import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How the JobMaxxing web app and Chrome extension store, process, and protect account, application, and document data.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "JobMaxxing privacy",
    description:
      "How the JobMaxxing web app and Chrome extension handle account, application, and document data.",
    url: "/privacy",
  },
};

const sections = [
  {
    title: "Data the web app stores",
    paragraphs: [
      "JobMaxxing stores account details, career-profile content, application records, resume and cover-letter content, uploaded files, and saved Maxwell threads needed to provide the workspace.",
      "The current repository contains no advertising or third-party analytics integration and has no public-profile, sharing, recruiter-access, or employer-facing feature.",
    ],
  },
  {
    title: "How access is controlled",
    paragraphs: [
      "Application data is protected by Supabase Auth and row-level security policies scoped to the signed-in user. PDF and DOCX files are stored in a private bucket and streamed through authenticated app routes rather than exposed through permanent public URLs.",
      "A public Supabase publishable key identifies the client application; it is not a secret and does not replace user authentication or row-level security.",
    ],
  },
  {
    title: "Chrome extension data",
    paragraphs: [
      "The extension stores its Supabase session, display details, recent-application index, and local preferences in Chrome local storage. It can mirror the session to or from the configured JobMaxxing web origin so signing in or out stays aligned.",
      "On supported job sites, a content script checks whether the page appears to be an individual job posting. Job-page content is captured and sent only after the user selects Grab this posting; the extension does not autofill or submit an employer form.",
    ],
  },
  {
    title: "AI processing",
    paragraphs: [
      "Core tracking and deterministic parsing work without sending career data to an external AI model. When the deployment has Gemini configured and the user has granted AI-processing consent, relevant text may be sent to Google Gemini for assisted parsing, review, tailoring, or Maxwell responses.",
      "The original Gemini key remains on the web server and is never included in the browser extension.",
    ],
  },
  {
    title: "Deletion and deployment responsibility",
    paragraphs: [
      "Users can delete application records and documents and can clear editable career-profile content. Clearing a profile does not delete separate applications or documents. The current app does not provide self-service account deletion, so the operator of a deployed instance is responsible for handling complete account-deletion requests.",
      "The JobMaxxing source repository is publicly visible. Each authorized deployment chooses its Supabase and Gemini projects, and its operator is responsible for retention, access, support contacts and legal notices.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <main className="flex-1 border-b border-border bg-parchment surface-grid">
      <article className="mx-auto w-full max-w-[820px] px-5 py-14 sm:py-18">
        <p className="micro-label text-primary">Last updated September 4, 2026</p>
        <h1 className="mt-3 text-[2.5rem] font-semibold tracking-[-0.045em]">Privacy</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          This page describes the behavior of the current JobMaxxing source code. A hosted deployment should publish operator contact details and any additional terms before accepting users.
        </p>
        <div className="mt-10 divide-y divide-border rounded-xl border border-border bg-card px-6 shadow-paper">
          {sections.map((section) => (
            <section key={section.title} className="py-7">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-sm leading-7 text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
