import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  FileCheck2,
  Files,
  Plus,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

import { StatusBadge } from "@/components/applications/status-badge";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getApplications } from "@/lib/applications/repository";
import { getDocumentLibraryData } from "@/lib/documents/repository";
import { getCareerProfile } from "@/lib/profile/career";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };

const activeStatuses = new Set(["saved", "applied", "online_assessment", "interview", "final_round"]);

export default async function DashboardPage() {
  const [applications, documents, profile] = await Promise.all([
    getApplications(),
    getDocumentLibraryData(),
    getCareerProfile(),
  ]);
  const displayName = profile.fullName.trim().split(/\s+/)[0] || profile.email?.split("@")[0] || "there";
  const active = applications.filter((application) => activeStatuses.has(application.status)).length;
  const interviews = applications.filter((application) => application.status === "interview" || application.status === "final_round").length;
  const offers = applications.filter((application) => application.status === "offer").length;
  const completePackages = applications.filter((application) => application.submittedResumeVersionId && application.submittedCoverLetterId).length;
  const packageRate = applications.length ? Math.round((completePackages / applications.length) * 100) : 0;
  const profileCompletion = completionFor(profile);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcoming = applications
    .filter((application) => application.deadline && new Date(`${application.deadline}T00:00:00`) >= now)
    .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))
    .slice(0, 5);
  const recent = [...applications].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);

  return (
    <AppPage>
      <AppPageHeader
        title={`Welcome back, ${displayName}`}
        description="Your search at a glance — what moved, what is ready, and what needs attention next."
        action={
          <Link href="/applications/new" className={cn(buttonVariants({ size: "lg" }), "h-9 px-3.5")}>
            <Plus aria-hidden />Add application
          </Link>
        }
      />

      <section className="grid overflow-hidden rounded-xl border border-border bg-border shadow-paper sm:grid-cols-2 xl:grid-cols-5" aria-label="Job search summary">
        <Metric label="Applications" value={applications.length} detail="Total tracked" icon={BriefcaseBusiness} />
        <Metric label="Active pipeline" value={active} detail="Still in motion" icon={Target} />
        <Metric label="Interviews" value={interviews} detail="Interview and final" icon={CalendarClock} />
        <Metric label="Offers" value={offers} detail="Offers received" icon={Trophy} />
        <Metric label="Package readiness" value={`${packageRate}%`} detail={`${completePackages} complete`} icon={FileCheck2} />
      </section>

      {applications.length === 0 ? <GettingStarted /> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <Card className="min-w-0">
          <CardHeader className="border-b border-border">
            <CardTitle>Recent applications</CardTitle>
            <CardDescription>Your most recently updated opportunities.</CardDescription>
            <CardAction><Link href="/applications" className={buttonVariants({ variant: "ghost", size: "sm" })}>View pipeline<ArrowRight aria-hidden /></Link></CardAction>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length ? (
              <ul className="divide-y divide-border">
                {recent.map((application) => (
                  <li key={application.id}>
                    <Link href={`/applications/${application.id}`} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50">
                      <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-parchment text-xs font-semibold text-primary">
                        {application.companyName.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-[0.84rem] font-medium">{application.jobTitle}</span><span className="block truncate text-xs text-muted-foreground">{application.companyName}</span></span>
                      <StatusBadge status={application.status} className="hidden sm:inline-flex" />
                      <ArrowRight aria-hidden className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <EmptyPanel icon={BriefcaseBusiness} title="No applications yet" description="Add your first opportunity to start building your pipeline." />}
          </CardContent>
        </Card>

        <Card className="content-start">
          <CardHeader className="border-b border-border">
            <CardTitle>Upcoming deadlines</CardTitle>
            <CardDescription>Nearest dates come first.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {upcoming.length ? (
              <ul className="divide-y divide-border">
                {upcoming.map((application) => {
                  const days = daysUntil(application.deadline, now);
                  return (
                    <li key={application.id}>
                      <Link href={`/applications/${application.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50">
                        <span className={cn("grid size-8 shrink-0 place-items-center rounded-md border", days !== null && days <= 2 ? "border-destructive/25 bg-destructive/10 text-destructive" : "border-warning/25 bg-warning/10 text-warning")}><CalendarClock aria-hidden className="size-3.5" /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-[0.82rem] font-medium">{application.companyName}</span><span className="block truncate text-xs text-muted-foreground">{application.nextAction || application.jobTitle}</span></span>
                        <span className={cn("shrink-0 text-xs font-medium tabular-nums", days !== null && days <= 2 ? "text-destructive" : "text-muted-foreground")}>{deadlineLabel(days)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : <EmptyPanel icon={CheckCircle2} title="No upcoming deadlines" description="You’re clear for now. Add deadlines to see them here." />}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Career profile</CardTitle><CardDescription>{profileCompletion}% complete</CardDescription></CardHeader>
          <CardContent><Progress value={profileCompletion} /><p className="mt-3 text-xs leading-5 text-muted-foreground">Keep your experience complete so it is ready for the next tailored document.</p><Link href="/profile" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}>{profileCompletion < 100 ? "Continue profile" : "Review profile"}<ArrowRight aria-hidden /></Link></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Document library</CardTitle><CardDescription>Your reusable and tailored materials.</CardDescription></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2"><LibraryLink href="/resumes" icon={Files} label="Resumes" value={documents.masterResumes.length + documents.resumeVersions.length} /><LibraryLink href="/cover-letters" icon={FileCheck2} label="Cover letters" value={documents.coverLetters.length} /></CardContent>
        </Card>
      </div>
    </AppPage>
  );
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: number | string; detail: string; icon: typeof BriefcaseBusiness }) {
  return <div className="flex min-h-28 items-start gap-3 bg-card p-4 sm:[&:not(:nth-child(2n))]:border-r sm:[&:nth-child(n+3)]:border-t xl:border-t-0 xl:border-r xl:last:border-r-0"><span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Icon aria-hidden className="size-3.5" /></span><span><span className="block text-[1.6rem] font-semibold leading-none tracking-[-0.04em] tabular-nums">{value}</span><span className="mt-2 block text-[0.8rem] font-medium">{label}</span><span className="mt-0.5 block text-[0.7rem] text-muted-foreground">{detail}</span></span></div>;
}

function GettingStarted() {
  return <Card className="border-primary/20 bg-primary/[0.055]"><CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/12 text-primary"><Sparkles aria-hidden className="size-4" /></span><div className="flex-1"><h2 className="font-semibold">Start with your first opportunity</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Add a role, fill in your profile, then create the exact package you want to send.</p></div><div className="flex gap-2"><Link href="/applications/new" className={buttonVariants({ size: "sm" })}>Add application</Link><Link href="/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>Build profile</Link></div></CardContent></Card>;
}

function LibraryLink({ href, icon: Icon, label, value }: { href: string; icon: typeof Files; label: string; value: number }) {
  return <Link href={href} className="flex items-center gap-3 rounded-lg border border-border bg-parchment/55 p-3 transition-colors hover:bg-accent/60"><Icon aria-hidden className="size-4 text-primary" /><span className="flex-1 text-sm font-medium">{label}</span><Badge variant="secondary">{value}</Badge><ArrowRight aria-hidden className="size-3.5 text-muted-foreground" /></Link>;
}

function EmptyPanel({ icon: Icon, title, description }: { icon: typeof CircleDashed; title: string; description: string }) {
  return <div className="grid place-items-center px-4 py-10 text-center"><Icon aria-hidden className="size-5 text-muted-foreground" /><p className="mt-3 text-sm font-medium">{title}</p><p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p></div>;
}

function daysUntil(value: string | null, now: Date) {
  if (!value) return null;
  const target = new Date(`${value}T00:00:00`);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

function deadlineLabel(days: number | null) {
  if (days === null) return "—";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

function completionFor(profile: Awaited<ReturnType<typeof getCareerProfile>>) {
  const checks = [profile.fullName, profile.phone, profile.location, profile.summary, profile.links.length, profile.experiences.length, profile.education.length, profile.projects.length, profile.skills.length, profile.achievements.length];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
