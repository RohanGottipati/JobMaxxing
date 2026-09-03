import type { Metadata } from "next";
import Link from "next/link";
import { FileCode2 } from "lucide-react";

import { LatexCreateForm } from "@/components/latex/latex-create-form";
import { DocumentOpenLink } from "@/components/documents/document-open-link";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDocumentLibraryData } from "@/lib/documents/repository";
import { listLatexDocuments } from "@/lib/latex/repository";
import { latexStudioHref } from "@/lib/latex/types";

export const metadata: Metadata = { title: "LaTeX Studio" };

export default async function LatexStudioHomePage({
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
      <AppPageHeader
        title="LaTeX Studio"
        description="Write and compile resumes and cover letters in the browser. Documents stay listed in your existing libraries."
      />
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
          <h2 className="text-lg font-semibold">Recent LaTeX documents</h2>
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
                  <DocumentOpenLink href={latexStudioHref(item.kind, item.id)}>Open</DocumentOpenLink>
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
