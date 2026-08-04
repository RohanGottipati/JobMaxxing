import type { Metadata } from "next";

import { createMasterResumeAction } from "@/app/(app)/documents/actions";
import { DocumentCreateForm } from "@/components/documents/document-create-form";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { StructuredResumeCreateForm } from "@/components/resumes/structured-resume-create-form";

export const metadata: Metadata = { title: "New master resume" };

export default async function NewMasterResumePage({ searchParams }: { searchParams: Promise<{ error?: string; mode?: string; return?: string }> }) {
  const params = await searchParams;
  const legacy = params.mode === "legacy";
  return <AppPage size={legacy ? "form" : "wide"}><AppPageHeader title="New master resume" description="Create a reusable source resume, then tailor versions for individual opportunities." />{legacy ? <DocumentCreateForm kind="master_resume" action={createMasterResumeAction} error={params.error} /> : <StructuredResumeCreateForm error={params.error} returnTo={params.return === "onboarding" ? "onboarding" : "resumes"} />}</AppPage>;
}
