import type { Metadata } from "next";
import Link from "next/link";
import { FileCode2, Plus } from "lucide-react";

import { DocumentOpenLink } from "@/components/documents/document-open-link";
import { LatexCreateForm } from "@/components/latex/latex-create-form";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getDocumentLibraryData } from "@/lib/documents/repository";
import {
  isLatexDocumentKind,
  type LatexDocumentKind,
} from "@/lib/latex/constants";
import { listLatexDocuments } from "@/lib/latex/repository";
import { latexOverleafHref } from "@/lib/latex/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "LaTeX projects" };

function parseKind(value: string | undefined): LatexDocumentKind {
  return value && isLatexDocumentKind(value) ? value : "master_resume";
}

export default async function LatexHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; kind?: string; create?: string; application?: string }>;
}) {
  const params = await searchParams;
  const creating = Boolean(params.create || params.error || params.application);
  const kind = parseKind(params.create ?? params.kind);
  const data = creating
    ? { mode: "create" as const, documents: await getDocumentLibraryData() }
    : { mode: "list" as const, items: await listLatexDocuments() };

  return (
    <AppPage size="wide">
      <AppPageHeader
        title="LaTeX projects"
        description="Keep LaTeX source here and send a copy to Overleaf when you want to edit or compile."
        action={
          <Link href={creating ? "/latex" : "/latex?create=master_resume"} className={buttonVariants({ variant: creating ? "outline" : "default" })}>
            {creating ? "Back to projects" : <><Plus aria-hidden />New project</>}
          </Link>
        }
      />

      {data.mode === "create" ? (
        <section className="grid gap-3">
          <nav aria-label="LaTeX document type" className="flex flex-wrap gap-2">
            <KindLink kind="master_resume" active={kind === "master_resume"}>Master resume</KindLink>
            <KindLink kind="resume_version" active={kind === "resume_version"}>Tailored resume</KindLink>
            <KindLink kind="cover_letter" active={kind === "cover_letter"}>Cover letter</KindLink>
          </nav>
          <LatexCreateForm
            kind={kind}
            applications={kind === "master_resume" ? [] : data.documents.applications}
            masterResumes={kind === "resume_version" ? data.documents.masterResumes : []}
            defaultApplicationId={params.application}
            error={params.error}
            cancelHref="/latex"
            errorHref={`/latex?create=${kind}${params.application ? `&application=${params.application}` : ""}`}
          />
        </section>
      ) : (
        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Your projects</h2>
            <span className="text-xs tabular-nums text-muted-foreground">{data.items.length}</span>
          </div>
          {data.items.length ? (
            <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-paper">
              {data.items.map((item) => (
                <article key={`${item.kind}-${item.id}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/25">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-parchment text-primary"><FileCode2 aria-hidden className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold">{item.title}</h3>{item.locked ? <Badge variant="secondary">Submitted</Badge> : null}</div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{item.subtitle}</p>
                  </div>
                  <DocumentOpenLink href={latexOverleafHref(item.kind, item.id)}>Open</DocumentOpenLink>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-3 grid min-h-52 place-items-center rounded-xl border border-dashed border-border-strong bg-parchment/35 p-7 text-center">
              <div>
                <FileCode2 aria-hidden className="mx-auto size-5 text-muted-foreground" />
                <h2 className="mt-3 font-semibold">No LaTeX projects yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">Start a resume or cover letter from a template, a .tex file, or pasted source.</p>
                <Link href="/latex?create=master_resume" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>Create a project</Link>
              </div>
            </div>
          )}
        </section>
      )}
    </AppPage>
  );
}

function KindLink({ kind, active, children }: { kind: LatexDocumentKind; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={`/latex?create=${kind}`} aria-current={active ? "page" : undefined} className={buttonVariants({ variant: active ? "secondary" : "ghost", size: "sm" })}>
      {children}
    </Link>
  );
}
