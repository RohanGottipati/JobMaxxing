import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  FileCheck2,
  LockKeyhole,
  PanelRightOpen,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { SITE_DESCRIPTION } from "@/lib/site";
import { cn } from "@/lib/utils";

const EXTENSION_REPOSITORY =
  "https://github.com/RohanGottipati/JobMaxxing-extension";

export const metadata: Metadata = {
  title: "Chrome Extension for Job Post Capture",
  description:
    "Use the JobMaxxing Chrome extension to review and save job postings, submitted resume files, and cover letters to your JobMaxxing account.",
  alternates: { canonical: "/extension" },
  openGraph: {
    title: "JobMaxxing Chrome extension",
    description: SITE_DESCRIPTION,
    url: "/extension",
  },
};

const features = [
  {
    icon: ScanSearch,
    title: "Review before saving",
    body: "Grab a supported posting, check the extracted company, role, location, description, and dates, then edit anything that needs correction.",
  },
  {
    icon: PanelRightOpen,
    title: "Persistent side panel",
    body: "The Manifest V3 extension opens beside the current tab, so the posting remains visible while you review the application record.",
  },
  {
    icon: FileCheck2,
    title: "Preserve submitted files",
    body: "Attach the PDF or DOCX resume and cover letter used for a role. Each file is limited to 10 MB and saved to private storage.",
  },
  {
    icon: ShieldCheck,
    title: "One account and API",
    body: "The extension uses the same Supabase account and authenticated web API as JobMaxxing. It is a capture client, not another database.",
  },
] as const;

export default function ExtensionPage() {
  return (
    <main className="flex-1">
      <section className="border-b border-border bg-parchment surface-grid">
        <div className="mx-auto w-full max-w-[1000px] px-5 py-16 sm:py-20">
          <p className="micro-label text-primary">Chrome 114+ · Developer installation</p>
          <h1 className="mt-3 max-w-3xl text-balance text-[2.5rem] font-semibold leading-tight tracking-[-0.045em] sm:text-[3.2rem]">
            Capture the job post from a Chrome side panel.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            JobMaxxing detects individual postings on LinkedIn, Workday, Greenhouse, Lever, and Ashby. You stay in control: review the captured fields and choose when to save.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={EXTENSION_REPOSITORY}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ size: "lg" }), "h-10")}
            >
              View installation guide <ArrowRight aria-hidden />
            </a>
            <Link href="/privacy" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 bg-card")}>
              Privacy details
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-[1000px] gap-4 px-5 py-14 md:grid-cols-2">
          {features.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-xl border border-border bg-card p-6 shadow-paper">
              <Icon aria-hidden className="size-5 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-parchment">
        <div className="mx-auto w-full max-w-[820px] px-5 py-14">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5 shadow-paper">
            <LockKeyhole aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h2 className="font-semibold">Clear product boundary</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The extension does not autofill or submit employer forms, send email, or include a Gemini key. Saving a description starts server-side parsing; Gemini is used only when the web app is configured for it and the account has granted AI consent.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
