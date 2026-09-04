import type { Metadata } from "next";
import Link from "next/link";
import { FileCode2 } from "lucide-react";

import { LatexCreateForm } from "@/components/latex/latex-create-form";
import { DocumentOpenLink } from "@/components/documents/document-open-link";
import { AppPage } from "@/components/layout/app-page";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDocumentLibraryData } from "@/lib/documents/repository";
import { listLatexDocuments } from "@/lib/latex/repository";
import { latexOverleafHref } from "@/lib/latex/types";

export const metadata: Metadata = { title: "LaTeX with Overleaf" };

export default async function LatexOverleafHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; kind?: string; application?: string }>;
}) {
  const [params, documents, items] = await Promise.all([
    searchParams,
    getDocumentLibraryData(),
    listLatexDocuments(),
  ]);
  const kind = params.kind === "resume_version" || params.kind === "cover_letter" ? params.kind : "master_resume";

  return (
    <AppPage size="wide">
      <section className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-paper">
        <div className="grid gap-5 bg-[linear-gradient(120deg,color-mix(in_oklch,var(--primary),transparent_91%),transparent_65%)] px-5 py-6 sm:px-7 sm:py-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-3xl">
            <span className="mb-4 grid size-10 place-items-center rounded-lg border border-primary/20 bg-background text-primary shadow-sm">
              <FileCode2 aria-hidden className="size-5" />
            </span>
            <p className="micro-label text-primary">Cloud LaTeX workflow</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">LaTeX with Overleaf</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Start from your saved source, then edit, compile, and collaborate in Overleaf.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Overleaf capabilities">
            <Badge variant="outline" className="bg-background/80">Project import</Badge>
            <Badge variant="outline" className="bg-background/80">Cloud compile</Badge>
            <Badge variant="outline" className="bg-background/80">Final PDF handoff</Badge>
          </div>
        </div>
      </section>
      <Tabs defaultValue={kind}>
        <TabsList>
          <TabsTrigger value="master_resume">Master resume</TabsTrigger>
          <TabsTrigger value="resume_version">Tailored resume</TabsTrigger>
          <TabsTrigger value="cover_letter">Cover letter</TabsTrigger>
        </TabsList>
        <TabsContent value="master_resume">
          <LatexCreateForm
            kind="master_resume"
            error={params.error}
            cancelHref="/resumes"
            errorHref="/latex?kind=master_resume"
          />
        </TabsContent>
        <TabsContent value="resume_version">
          <LatexCreateForm
            kind="resume_version"
            applications={documents.applications}
            masterResumes={documents.masterResumes}
            defaultApplicationId={params.application}
            error={params.error}
            cancelHref="/resumes?tab=tailored"
            errorHref={`/latex?kind=resume_version${params.application ? `&application=${params.application}` : ""}`}
          />
        </TabsContent>
        <TabsContent value="cover_letter">
          <LatexCreateForm
            kind="cover_letter"
            applications={documents.applications}
            defaultApplicationId={params.application}
            error={params.error}
            cancelHref="/cover-letters"
            errorHref={`/latex?kind=cover_letter${params.application ? `&application=${params.application}` : ""}`}
          />
        </TabsContent>
      </Tabs>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="micro-label text-muted-foreground">Saved projects</p>
            <h2 className="mt-1 text-lg font-semibold">Your LaTeX documents</h2>
          </div>
          <Link href="/resumes" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Open libraries
          </Link>
        </div>
        {items.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <Card key={`${item.kind}-${item.id}`}>
                <CardContent className="flex items-start gap-3 pt-5">
                  <span className="grid size-9 place-items-center rounded-md border border-border bg-parchment text-primary">
                    <FileCode2 aria-hidden className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-medium">{item.title}</h3>
                      {item.locked ? <Badge variant="secondary">Submitted</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>
                  </div>
                  <DocumentOpenLink href={latexOverleafHref(item.kind, item.id)}>Open</DocumentOpenLink>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border-strong bg-parchment/35 p-6 text-sm text-muted-foreground">
            No LaTeX documents yet. Create one above, or choose LaTeX when adding a resume or cover letter.
          </p>
        )}
      </section>
    </AppPage>
  );
}
