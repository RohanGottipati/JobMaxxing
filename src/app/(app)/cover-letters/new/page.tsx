import type { Metadata } from "next";
import Link from "next/link";

import { createCoverLetterAction } from "@/app/(app)/documents/actions";
import { DocumentCreateForm } from "@/components/documents/document-create-form";
import { LatexCreateForm } from "@/components/latex/latex-create-form";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { buttonVariants } from "@/components/ui/button";
import { getDocumentLibraryData } from "@/lib/documents/repository";

export const metadata: Metadata = { title: "New cover letter" };

export default async function NewCoverLetterPage({ searchParams }: { searchParams: Promise<{ application?: string; error?: string; mode?: string }> }) {
  const [data, params] = await Promise.all([getDocumentLibraryData(), searchParams]);
  const latex = params.mode === "latex";
  return (
    <AppPage size="form">
      <AppPageHeader title="New cover letter" description="Create a focused letter for a specific opportunity." />
      {latex ? (
        <div className="grid gap-4">
          <LatexCreateForm
            kind="cover_letter"
            applications={data.applications}
            defaultApplicationId={params.application}
            error={params.error}
            cancelHref="/cover-letters"
          />
          <Link href="/cover-letters/new" className={buttonVariants({ variant: "ghost" })}>Use the text editor</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          <DocumentCreateForm kind="cover_letter" action={createCoverLetterAction} applications={data.applications} defaultApplicationId={params.application} error={params.error} />
          <Link href={`/cover-letters/new?mode=latex${params.application ? `&application=${params.application}` : ""}`} className={buttonVariants({ variant: "ghost" })}>Create with LaTeX</Link>
        </div>
      )}
    </AppPage>
  );
}
