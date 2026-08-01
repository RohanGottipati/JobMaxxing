import type { Metadata } from "next";

import { createMasterResumeAction } from "@/app/(app)/documents/actions";
import { DocumentCreateForm } from "@/components/documents/document-create-form";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";

export const metadata: Metadata = { title: "New master resume" };

export default async function NewMasterResumePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <AppPage size="form"><AppPageHeader title="New master resume" description="Create a reusable source resume, then tailor versions for individual opportunities." /><DocumentCreateForm kind="master_resume" action={createMasterResumeAction} error={params.error} /></AppPage>;
}
