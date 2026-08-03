"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, FileCheck2, FileText, Files, Search, Star, UploadCloud } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CoverLetterItem, MasterResumeItem, TailoredResumeItem } from "@/lib/documents/types";
import { cn } from "@/lib/utils";

type ResumeLibraryProps = {
  mode: "resumes";
  masterResumes: MasterResumeItem[];
  resumeVersions: TailoredResumeItem[];
  initialTab?: "master" | "tailored";
};

type CoverLibraryProps = { mode: "cover_letters"; coverLetters: CoverLetterItem[] };

export function DocumentLibrary(props: ResumeLibraryProps | CoverLibraryProps) {
  const [query, setQuery] = useState("");
  const [applicationId, setApplicationId] = useState("all");
  const [tab, setTab] = useState<"master" | "tailored">(
    props.mode === "resumes" ? (props.initialTab ?? "master") : "tailored",
  );

  const applicationOptions = useMemo(() => {
    const source = props.mode === "resumes" ? props.resumeVersions : props.coverLetters;
    const seen = new Map<string, string>();
    source.forEach((item) => {
      if (item.application) seen.set(item.application.id, `${item.application.companyName} · ${item.application.jobTitle}`);
    });
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [props]);

  const normalized = query.trim().toLowerCase();
  const items = useMemo(() => {
    if (props.mode === "resumes" && tab === "master") {
      return props.masterResumes.filter((item) => `${item.name} ${item.content ?? ""}`.toLowerCase().includes(normalized));
    }
    const source = props.mode === "resumes" ? props.resumeVersions : props.coverLetters;
    return source.filter((item) => {
      const matchesApp = applicationId === "all" || item.application_id === applicationId;
      const haystack = `${item.title ?? ""} ${item.content ?? ""} ${item.application?.companyName ?? ""} ${item.application?.jobTitle ?? ""}`.toLowerCase();
      return matchesApp && haystack.includes(normalized);
    });
  }, [applicationId, normalized, props, tab]);

  const isMaster = props.mode === "resumes" && tab === "master";
  const createHref = props.mode === "cover_letters" ? "/cover-letters/new" : isMaster ? "/resumes/new" : "/resumes/versions/new";

  return (
    <div className="grid gap-4">
      {props.mode === "resumes" ? (
        <Tabs value={tab} onValueChange={(value) => setTab(value as "master" | "tailored")}>
          <TabsList className="h-auto max-w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0">
            <TabsTrigger value="master" className="folder-tab h-9 shrink-0 rounded-none border border-b-0 border-transparent bg-parchment/60 px-4 data-active:border-border data-active:bg-card data-active:shadow-none">Master resumes <Badge variant="secondary" className="ml-1 h-5 px-1.5">{props.masterResumes.length}</Badge></TabsTrigger>
            <TabsTrigger value="tailored" className="folder-tab h-9 shrink-0 rounded-none border border-b-0 border-transparent bg-parchment/60 px-4 data-active:border-border data-active:bg-card data-active:shadow-none">Tailored versions <Badge variant="secondary" className="ml-1 h-5 px-1.5">{props.resumeVersions.length}</Badge></TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      <div className={cn("surface-grid grid gap-3 rounded-xl border border-border bg-card p-3 shadow-paper sm:grid-cols-[minmax(0,1fr)_minmax(10rem,16rem)_auto]", props.mode === "resumes" && "-mt-4 rounded-tl-none")}>
        <div className="relative"><Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${props.mode === "resumes" ? "resumes" : "cover letters"}`} className="h-10 pl-9" /></div>
        {!isMaster ? <Select value={applicationId} onChange={(event) => setApplicationId(event.target.value)} className="h-10"><option value="all">All applications</option>{applicationOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</Select> : <div />}
        <Link href={createHref} className={cn(buttonVariants({ size: "lg" }), "h-10 px-4")}>{props.mode === "cover_letters" ? "New cover letter" : isMaster ? "New master resume" : "New tailored resume"}</Link>
      </div>

      {items.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => <DocumentCard key={item.id} item={item as MasterResumeItem | TailoredResumeItem | CoverLetterItem} kind={props.mode === "cover_letters" ? "cover_letter" : isMaster ? "master_resume" : "resume_version"} />)}
        </div>
      ) : <EmptyLibrary kind={props.mode === "cover_letters" ? "cover_letter" : isMaster ? "master_resume" : "resume_version"} href={createHref} filtered={Boolean(normalized || applicationId !== "all")} />}
    </div>
  );
}

function DocumentCard({ item, kind }: { item: MasterResumeItem | TailoredResumeItem | CoverLetterItem; kind: "master_resume" | "resume_version" | "cover_letter" }) {
  const master = kind === "master_resume" ? item as MasterResumeItem : null;
  const version = kind !== "master_resume" ? item as TailoredResumeItem | CoverLetterItem : null;
  const title = master?.name || version?.title || `${kind === "cover_letter" ? "Cover letter" : "Resume"} v${version?.version_number}`;
  const href = kind === "master_resume" ? `/resumes/${item.id}` : kind === "resume_version" ? `/resumes/versions/${item.id}` : `/cover-letters/${item.id}`;
  return (
    <Card className="interactive-card group bg-card hover:border-border-strong hover:bg-elevated hover:shadow-[0_12px_28px_-14px_rgb(41_40_36/0.4)]">
      <CardContent className="flex min-h-56 flex-col">
        <div className="flex items-start justify-between gap-3"><span className="grid size-9 place-items-center rounded-md border border-border bg-parchment text-primary">{kind === "master_resume" ? <Files aria-hidden className="size-4" /> : kind === "resume_version" ? <FileCheck2 aria-hidden className="size-4" /> : <FileText aria-hidden className="size-4" />}</span><div className="flex flex-wrap justify-end gap-1.5">{master?.is_default ? <Badge className="bg-primary/12 text-primary hover:bg-primary/12"><Star aria-hidden className="mr-1 size-3" />Default</Badge> : null}{version?.submitted_at ? <Badge className="bg-success/12 text-success hover:bg-success/12">Submitted</Badge> : null}{item.file_path ? <Badge variant="outline"><UploadCloud aria-hidden className="mr-1 size-3" />File</Badge> : null}</div></div>
        <h2 className="mt-5 line-clamp-2 text-base font-semibold tracking-[-0.025em]">{title}</h2>
        {version?.application ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{version.application.companyName} · {version.application.jobTitle}</p> : <p className="mt-1 text-sm text-muted-foreground">{master ? "Reusable master resume" : "Application document"}</p>}
        <p className="paper-rule mt-4 line-clamp-3 min-h-16 whitespace-pre-wrap rounded-md border border-border bg-parchment/45 px-3 py-2 text-xs leading-5 text-muted-foreground">{item.content || "No text content added yet."}</p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4"><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays aria-hidden className="size-3.5" />Updated {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(item.updated_at))}</span><Link href={href} className={buttonVariants({ variant: "outline", size: "sm" })}>Open</Link></div>
      </CardContent>
    </Card>
  );
}

function EmptyLibrary({ kind, href, filtered }: { kind: "master_resume" | "resume_version" | "cover_letter"; href: string; filtered: boolean }) {
  const label = kind === "master_resume" ? "master resumes" : kind === "resume_version" ? "tailored resumes" : "cover letters";
  return <div className="surface-grid grid min-h-72 place-items-center rounded-xl border border-dashed border-border-strong bg-parchment/35 p-8 text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-md border border-border bg-card text-muted-foreground"><FileText aria-hidden className="size-5" /></span><h2 className="mt-4 font-semibold">{filtered ? "Nothing matches those filters" : `No ${label} yet`}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{filtered ? "Try a different search or application." : `Create your first ${label.replace(/s$/, "")} to start building your document library.`}</p>{!filtered ? <Link href={href} className={cn(buttonVariants({ size: "sm" }), "mt-5")}>Create one</Link> : null}</div></div>;
}
