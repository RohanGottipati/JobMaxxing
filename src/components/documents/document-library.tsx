"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, FileCheck2, FileText, Files, Plus, Search, Star, UploadCloud } from "lucide-react";

import { DocumentOpenLink } from "@/components/documents/document-open-link";
import { DocumentPreviewButton } from "@/components/previews/document-preview-dialog";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CoverLetterItem, MasterResumeItem, TailoredResumeItem } from "@/lib/documents/types";
import { documentWorkspaceHref } from "@/lib/latex/types";
import { cn } from "@/lib/utils";

const documentDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

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
  const kind = props.mode === "cover_letters" ? "cover_letter" : isMaster ? "master_resume" : "resume_version";
  const createHref = props.mode === "cover_letters" ? "/cover-letters/new" : isMaster ? "/resumes/new" : "/resumes/versions/new";
  const createLabel = props.mode === "cover_letters" ? "New cover letter" : isMaster ? "New master resume" : "New tailored resume";

  return (
    <div className="grid gap-4">
      {props.mode === "resumes" ? (
        <Tabs value={tab} onValueChange={(value) => setTab(value as "master" | "tailored")}>
          <TabsList className="h-9 justify-start">
            <TabsTrigger value="master">Master <Badge variant="secondary" className="ml-1 h-5 px-1.5">{props.masterResumes.length}</Badge></TabsTrigger>
            <TabsTrigger value="tailored">Tailored <Badge variant="secondary" className="ml-1 h-5 px-1.5">{props.resumeVersions.length}</Badge></TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      <div className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,15rem)_auto]">
        <div className="relative">
          <Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${props.mode === "resumes" ? "resumes" : "cover letters"}`} className="h-9 pl-9" />
        </div>
        {!isMaster ? (
          <Select value={applicationId} onChange={(event) => setApplicationId(event.target.value)} className="h-9">
            <option value="all">All applications</option>
            {applicationOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </Select>
        ) : <div />}
        <Link href={createHref} className={cn(buttonVariants({ size: "sm" }), "h-9")}><Plus aria-hidden />{createLabel}</Link>
      </div>

      {items.length ? (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-paper">
          {items.map((item) => (
            <DocumentRow
              key={item.id}
              item={item as MasterResumeItem | TailoredResumeItem | CoverLetterItem}
              kind={kind}
            />
          ))}
        </div>
      ) : (
        <EmptyLibrary kind={kind} href={createHref} filtered={Boolean(normalized || applicationId !== "all")} />
      )}
    </div>
  );
}

function DocumentRow({ item, kind }: { item: MasterResumeItem | TailoredResumeItem | CoverLetterItem; kind: "master_resume" | "resume_version" | "cover_letter" }) {
  const master = kind === "master_resume" ? item as MasterResumeItem : null;
  const version = kind !== "master_resume" ? item as TailoredResumeItem | CoverLetterItem : null;
  const title = master?.name || version?.title || `${kind === "cover_letter" ? "Cover letter" : "Resume"} v${version?.version_number}`;
  const href = documentWorkspaceHref(kind, item.id, item.content_format);
  const Icon = kind === "master_resume" ? Files : kind === "resume_version" ? FileCheck2 : FileText;

  return (
    <article className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/25 sm:flex-row sm:items-center">
      <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-parchment text-primary"><Icon aria-hidden className="size-4" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          {master?.is_default ? <Badge className="bg-primary/12 text-primary hover:bg-primary/12"><Star aria-hidden className="mr-1 size-3" />Default</Badge> : null}
          {version?.submitted_at ? <Badge className="bg-success/12 text-success hover:bg-success/12">Submitted</Badge> : null}
          {item.content_format === "latex" ? <Badge variant="outline">LaTeX</Badge> : null}
          {item.file_path ? <Badge variant="outline"><UploadCloud aria-hidden className="mr-1 size-3" />File</Badge> : null}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {version?.application ? `${version.application.companyName} · ${version.application.jobTitle}` : master ? "Reusable resume" : "Application document"}
          <span className="mx-1.5">·</span>
          <CalendarDays aria-hidden className="mr-1 inline size-3" />
          {documentDateFormatter.format(new Date(item.updated_at))}
        </p>
      </div>
      <div className="flex shrink-0 gap-2 self-end sm:self-auto">
        <DocumentPreviewButton kind={kind} id={item.id} title={title} variant="ghost" />
        <DocumentOpenLink href={href}>Open</DocumentOpenLink>
      </div>
    </article>
  );
}

function EmptyLibrary({ kind, href, filtered }: { kind: "master_resume" | "resume_version" | "cover_letter"; href: string; filtered: boolean }) {
  const label = kind === "master_resume" ? "master resumes" : kind === "resume_version" ? "tailored resumes" : "cover letters";
  return (
    <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-border-strong bg-parchment/35 p-7 text-center">
      <div>
        <FileText aria-hidden className="mx-auto size-5 text-muted-foreground" />
        <h2 className="mt-3 font-semibold">{filtered ? "Nothing matches" : `No ${label} yet`}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{filtered ? "Try a different search or application." : "Create one when you need it."}</p>
        {!filtered ? <Link href={href} className={cn(buttonVariants({ size: "sm" }), "mt-4")}>Create one</Link> : null}
      </div>
    </div>
  );
}
