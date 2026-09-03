import type { Metadata } from "next";
import Link from "next/link";

import { createTailoredResumeAction } from "@/app/(app)/documents/actions";
import { DocumentCreateForm } from "@/components/documents/document-create-form";
import { LatexCreateForm } from "@/components/latex/latex-create-form";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { buttonVariants } from "@/components/ui/button";
import { getDocumentLibraryData } from "@/lib/documents/repository";

export const metadata: Metadata = { title: "New tailored resume" };

export default async function NewTailoredResumePage({ searchParams }: { searchParams: Promise<{ application?: string; error?: string; mode?: string }> }) {
  const [data, params] = await Promise.all([getDocumentLibraryData(), searchParams]);
  const latex = params.mode === "latex";
  return (
    <AppPage size="form">
      <AppPageHeader title="New tailored resume" description="Create an application-specific version while preserving your reusable master." />
      {latex ? (
        <div className="grid gap-4">
          <LatexCreateForm
            kind="resume_version"
            applications={data.applications}
            masterResumes={data.masterResumes}
            defaultApplicationId={params.application}
            error={params.error}
            cancelHref="/resumes?tab=tailored"
          />
          <Link href="/resumes/versions/new" className={buttonVariants({ variant: "ghost" })}>Use the text editor</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          <DocumentCreateForm kind="resume_version" action={createTailoredResumeAction} applications={data.applications} masterResumes={data.masterResumes} defaultApplicationId={params.application} error={params.error} />
          <Link href={`/resumes/versions/new?mode=latex${params.application ? `&application=${params.application}` : ""}`} className={buttonVariants({ variant: "ghost" })}>Create with LaTeX</Link>
        </div>
      )}
    </AppPage>
  );
}
