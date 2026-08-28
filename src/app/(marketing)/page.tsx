import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Columns3,
  FileSignature,
  FileText,
  Lock,
  Shield,
  UserRound,
} from "lucide-react";

import { StatusBadge } from "@/components/applications/status-badge";
import { BrandMark } from "@/components/layout/brand";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { statusAccents } from "@/lib/applications/status";
import type { ApplicationStatus } from "@/lib/applications/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your job search, finally in one place",
};

const faqs = [
  [
    "Is JobMaxxing free?",
    "Yes, while you are searching. There is no employer-facing product and nothing is sold on top of your data.",
  ],
  [
    "Can I edit a document I already submitted?",
    "The submitted version stays locked as a record of what the employer received. Duplicate it to make a new, fully editable version.",
  ],
  [
    "What file types can I upload?",
    "PDF and DOCX, up to 10 MB each. Files are stored privately and opened through signed links that expire after five minutes.",
  ],
  [
    "Do I have to use the Kanban board?",
    "No. The board and table are two views of the same live data. Use the board to triage and the table to review.",
  ],
  [
    "Does anyone else see my applications?",
    "No. JobMaxxing is a single-person workspace with no sharing, recruiter access, or public profile.",
  ],
] as const;

export default async function HomePage() {
  const user = await getCurrentUser();
  const primaryHref = user ? "/dashboard" : "/signup";
  const primaryLabel = user ? "Open your workspace" : "Start organizing";

  return (
    <main className="flex flex-1 flex-col overflow-x-clip">
      <section className="border-b border-border bg-parchment surface-grid">
        <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-14 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:items-center lg:py-20">
          <div className="motion-rise">
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground shadow-paper">
              <span aria-hidden className="size-1.5 rounded-full bg-success" />
              A private workspace for one job search
            </span>
            <h1 className="mt-5 text-balance text-[2.4rem] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[3rem]">
              Your entire job search, finally in one place.
            </h1>
            <p className="mt-4 max-w-lg text-[0.97rem] leading-7 text-muted-foreground">
              Track every opportunity, preserve every tailored document, and always know what to do next.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link href={primaryHref} className={cn(buttonVariants({ size: "lg" }), "h-10 px-4")}>
                {primaryLabel}
                <ArrowRight aria-hidden />
              </Link>
              <Link href="#how-it-works" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 px-4 bg-card")}>
                See how it works
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Private by default · No recruiter access · Secure file storage
            </p>
          </div>

          <ProductPreview />
        </div>
      </section>

      <section id="features" className="scroll-mt-16 border-b border-border">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-16">
          <p className="micro-label text-muted-foreground">What’s inside</p>
          <h2 className="mt-2 max-w-2xl text-[1.9rem] font-semibold leading-tight tracking-[-0.035em]">
            Five surfaces that carry a whole search
          </h2>

          <div className="mt-8 grid gap-4 lg:grid-cols-6">
            <FeatureCard className="lg:col-span-4" icon={Columns3} title="Application pipeline">
              Eight honest stages, from Saved to Offer. Move a card when something changes, or switch to the structured table and review the whole search at once.
              <div className="mt-5 flex flex-wrap gap-1.5">
                {(["saved", "applied", "online_assessment", "interview", "final_round", "offer"] as ApplicationStatus[]).map((status) => (
                  <StatusBadge key={status} status={status} />
                ))}
              </div>
            </FeatureCard>
            <FeatureCard className="lg:col-span-2" icon={FileText} title="Resume & letter library">
              Reusable master resumes, application-specific versions, and a dedicated home for cover letters.
              <MiniDocuments />
            </FeatureCard>
            <FeatureCard className="lg:col-span-2" icon={UserRound} title="Career profile">
              One structured record of experience, education, projects, and skills. Tailoring becomes subtraction instead of memory.
              <div className="mt-5 rounded-lg border border-border bg-parchment/70 p-3">
                <p className="micro-label text-muted-foreground">Completeness</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full w-[86%] bg-primary" /></div>
                <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">86% complete</p>
              </div>
            </FeatureCard>
            <FeatureCard className="lg:col-span-2" icon={CalendarClock} title="Deadlines & next actions">
              Every active application carries one concrete next step. Your dashboard sorts the urgent work first.
              <ul className="mt-5 grid gap-2 text-xs">
                {[['Notion', 'Due tomorrow'], ['Linear', 'In 2 days'], ['Stripe', 'In 4 days']].map(([company, due], index) => (
                  <li key={company} className="flex justify-between rounded-lg border border-border bg-parchment/70 px-3 py-2">
                    <span>{company}</span><span className={index < 2 ? "font-medium text-destructive" : "text-muted-foreground"}>{due}</span>
                  </li>
                ))}
              </ul>
            </FeatureCard>
            <FeatureCard className="lg:col-span-2" icon={Shield} title="Private document storage">
              PDF and DOCX up to 10 MB, stored privately. Previews open through a link that expires after five minutes.
              <div className="mt-5 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-xs">
                <Lock aria-hidden className="size-3.5 text-success" />Submitted documents lock permanently
              </div>
            </FeatureCard>
            <FeatureCard className="lg:col-span-2" icon={FileSignature} title="Letters that stay findable">
              Cover letters live in their own library, so the paragraph you wrote last month is still within reach.
              <div className="paper-rule mt-5 rounded-lg border border-border bg-parchment/65 p-3 text-xs leading-6 text-muted-foreground">
                “The work I care most about is making a dense workflow feel clear…”
              </div>
            </FeatureCard>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-16 border-b border-border bg-parchment">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-16">
          <p className="micro-label text-muted-foreground">How it works</p>
          <h2 className="mt-2 text-[1.9rem] font-semibold tracking-[-0.035em]">Three steps to a search that runs itself</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["01", "Capture the role", "Add the company, title, and link. Everything else can grow as the process moves."],
              ["02", "Tailor the package", "Duplicate a master resume, adjust it for the role, and attach the final file."],
              ["03", "Move it and lock it", "Advance the application and mark sent documents submitted so history stays exact."],
            ].map(([number, title, body]) => (
              <li key={number} className="interactive-card rounded-xl border border-border bg-card p-6 shadow-paper hover:border-border-strong hover:shadow-lg">
                <span className="text-xs font-semibold tabular-nums text-primary">{number}</span>
                <h3 className="mt-2 text-[1.05rem] font-semibold tracking-[-0.02em]">{title}</h3>
                <p className="mt-2 text-[0.84rem] leading-6 text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="faq" className="scroll-mt-16 border-b border-border">
        <div className="mx-auto w-full max-w-[820px] px-5 py-16">
          <p className="micro-label text-muted-foreground">FAQ</p>
          <h2 className="mt-2 text-[1.9rem] font-semibold tracking-[-0.035em]">Questions worth answering up front</h2>
          <Accordion type="single" collapsible className="mt-6">
            {faqs.map(([question, answer], index) => (
              <AccordionItem key={question} value={`faq-${index}`}>
                <AccordionTrigger className="text-left text-[0.94rem]">{question}</AccordionTrigger>
                <AccordionContent className="text-sm leading-6 text-muted-foreground">{answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="border-b border-border bg-parchment surface-grid">
        <div className="mx-auto max-w-[820px] px-5 py-16 text-center">
          <h2 className="text-[2rem] font-semibold tracking-[-0.035em]">Run your search like a system.</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            Ten minutes of setup buys you a workspace that remembers what a spreadsheet, folder, and your head otherwise have to share.
          </p>
          <Link href={primaryHref} className={cn(buttonVariants({ size: "lg" }), "mt-7 h-10 px-4")}>
            {primaryLabel}<ArrowRight aria-hidden />
          </Link>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ className, icon: Icon, title, children }: { className?: string; icon: typeof Columns3; title: string; children: React.ReactNode }) {
  return (
    <article className={cn("interactive-card rounded-xl border border-border bg-card p-6 shadow-paper hover:border-border-strong hover:bg-elevated hover:shadow-lg", className)}>
      <div className="flex items-center gap-2"><Icon aria-hidden className="size-4 text-primary" /><h3 className="text-[1.05rem] font-semibold">{title}</h3></div>
      <div className="mt-2 text-[0.84rem] leading-6 text-muted-foreground">{children}</div>
    </article>
  );
}

function MiniDocuments() {
  return (
    <div className="mt-5 grid gap-2">
      {[["Product Design — Core", "Default"], ["Stripe — Payments v3", "Submitted"], ["Notion — Growth v2", "Draft"]].map(([name, state]) => (
        <div key={name} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-parchment/70 px-3 py-2 text-xs">
          <span className="truncate text-foreground">{name}</span><span className="micro-label shrink-0">{state}</span>
        </div>
      ))}
    </div>
  );
}

function ProductPreview() {
  const columns: Array<{ status: ApplicationStatus; label: string; cards: Array<[string, string]> }> = [
    { status: "applied", label: "Applied", cards: [["Product Designer, Systems", "Figma"], ["Product Designer II", "Airtable"]] },
    { status: "interview", label: "Interview", cards: [["Product Designer, Payments", "Stripe"], ["Product Designer, Claude", "Anthropic"]] },
    { status: "offer", label: "Offer", cards: [["Product Designer, Platform", "Retool"]] },
  ];
  return (
    <div className="motion-rise interactive-card overflow-hidden rounded-xl border border-border-strong bg-background shadow-[0_12px_32px_-18px_rgb(41_40_36/0.45)] hover:shadow-xl">
      <div className="flex items-center gap-2 border-b border-border bg-parchment px-3 py-2">
        <span aria-hidden className="flex gap-1.5"><span className="size-2 rounded-full bg-border-strong" /><span className="size-2 rounded-full bg-border-strong" /><span className="size-2 rounded-full bg-border-strong" /></span>
        <span className="mx-auto rounded border border-border bg-card px-3 py-0.5 font-mono text-[0.6rem] text-muted-foreground">jobmaxxing.app/applications</span>
      </div>
      <div className="flex">
        <div className="hidden w-[132px] shrink-0 border-r border-border bg-sidebar p-2.5 sm:block">
          <div className="flex items-center gap-1.5 pb-3"><BrandMark className="size-4" /><span className="text-[0.62rem] font-semibold">JobMaxxing</span></div>
          <div className="mb-2 h-5 rounded bg-primary" />
          {["Home", "Applications", "My Resumes", "My Cover Letters", "Documentation", "User Profile"].map((item, index) => (
            <div key={item} className={cn("mb-0.5 rounded px-1.5 py-1 text-[0.58rem]", index === 1 ? "bg-sidebar-accent font-medium" : "text-muted-foreground")}>{item}</div>
          ))}
        </div>
        <div className="min-w-0 flex-1 p-3">
          <div className="flex items-center justify-between"><div><p className="text-xs font-semibold">Applications</p><p className="text-[0.58rem] text-muted-foreground">12 tracked · 3 due this week</p></div><span className="rounded border border-border bg-card px-1.5 py-0.5 text-[0.56rem]">Board&nbsp;&nbsp; Table</span></div>
          <div className="mt-2.5 grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-border bg-border">
            {[["Total", "12"], ["Active", "8"], ["Interviews", "3"], ["Offers", "1"]].map(([label, value]) => <div key={label} className="bg-card px-2 py-1.5"><p className="micro-label text-[0.47rem] text-muted-foreground">{label}</p><p className="text-sm font-semibold tabular-nums">{value}</p></div>)}
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {columns.map((column) => (
              <div key={column.status} className="rounded-lg border border-border bg-parchment/70 p-1.5">
                <div className="flex items-center gap-1 pb-1.5"><span className={cn("size-1.5 rounded-full", statusAccents[column.status].dot)} /><span className="text-[0.58rem] font-semibold">{column.label}</span><span className="ml-auto text-[0.52rem] tabular-nums text-muted-foreground">{column.cards.length}</span></div>
                <div className="grid gap-1.5">{column.cards.map(([role, company]) => <div key={role} className="relative overflow-hidden rounded border border-border bg-elevated p-1.5 pl-2 shadow-paper"><span className={cn("absolute inset-y-1 left-0 w-0.5 rounded-r", statusAccents[column.status].dot)} /><p className="truncate text-[0.58rem] font-semibold">{role}</p><p className="truncate text-[0.54rem] text-muted-foreground">{company}</p><div className="mt-1 flex gap-1"><span className="rounded bg-success/15 px-1 text-[0.48rem] font-medium text-success">CV</span><span className="rounded bg-background px-1 text-[0.48rem] text-muted-foreground">CL</span></div></div>)}</div>
              </div>
            ))}
          </div>
          <div className="mt-2.5 rounded-lg border border-border bg-card p-2">
            <div className="flex items-center justify-between"><span className="text-[0.58rem] font-semibold">Documents for Stripe</span><span className="inline-flex items-center gap-1 rounded bg-success/15 px-1 text-[0.48rem] text-success"><Lock className="size-2" />Submitted</span></div>
            <div className="mt-1.5 flex items-center gap-1.5 border-t border-border pt-1.5 text-[0.54rem] text-muted-foreground"><FileText className="size-2.5" />avery-stripe-v3.pdf</div>
          </div>
        </div>
      </div>
    </div>
  );
}
