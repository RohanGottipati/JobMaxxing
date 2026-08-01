import type { Metadata } from "next";

import { createTailoredResumeAction } from "@/app/(app)/documents/actions";
import { DocumentCreateForm } from "@/components/documents/document-create-form";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { getDocumentLibraryData } from "@/lib/documents/repository";

export const metadata: Metadata = { title: "New tailored resume" };

export default async function NewTailoredResumePage({ searchParams }: { searchParams: Promise<{ application?: string; error?: string }> }) {
  const [data, params] = await Promise.all([getDocumentLibraryData(), searchParams]);
  return <AppPage size="form"><AppPageHeader title="New tailored resume" description="Create an application-specific version while preserving your reusable master." /><DocumentCreateForm kind="resume_version" action={createTailoredResumeAction} applications={data.applications} masterResumes={data.masterResumes} defaultApplicationId={params.application} error={params.error} /></AppPage>;
}
