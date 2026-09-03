import type { Metadata } from "next";
import Link from "next/link";

import { createMasterResumeAction } from "@/app/(app)/documents/actions";
import { DocumentCreateForm } from "@/components/documents/document-create-form";
import { LatexCreateForm } from "@/components/latex/latex-create-form";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { StructuredResumeCreateForm } from "@/components/resumes/structured-resume-create-form";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "New master resume" };

export default async function NewMasterResumePage({ searchParams }: { searchParams: Promise<{ error?: string; mode?: string; return?: string }> }) {
  const params = await searchParams;
  const latex = params.mode === "latex";
  const legacy = params.mode === "legacy";
  return (
    <AppPage size={legacy || latex ? "form" : "wide"}>
      <AppPageHeader title="New master resume" description="Create a reusable source resume, then tailor versions for individual opportunities." />
      {latex ? (
        <div className="grid gap-4">
          <LatexCreateForm kind="master_resume" error={params.error} cancelHref="/resumes" />
          <Link href="/resumes/new" className={buttonVariants({ variant: "ghost" })}>Use the structured builder</Link>
        </div>
      ) : legacy ? (
        <DocumentCreateForm kind="master_resume" action={createMasterResumeAction} error={params.error} />
      ) : (
        <StructuredResumeCreateForm error={params.error} returnTo={params.return === "onboarding" ? "onboarding" : "resumes"} />
      )}
    </AppPage>
  );
}
