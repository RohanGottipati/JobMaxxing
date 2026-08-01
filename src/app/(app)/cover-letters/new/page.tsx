import type { Metadata } from "next";

import { createCoverLetterAction } from "@/app/(app)/documents/actions";
import { DocumentCreateForm } from "@/components/documents/document-create-form";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { getDocumentLibraryData } from "@/lib/documents/repository";

export const metadata: Metadata = { title: "New cover letter" };

export default async function NewCoverLetterPage({ searchParams }: { searchParams: Promise<{ application?: string; error?: string }> }) {
  const [data, params] = await Promise.all([getDocumentLibraryData(), searchParams]);
  return <AppPage size="form"><AppPageHeader title="New cover letter" description="Create a focused letter for a specific opportunity." /><DocumentCreateForm kind="cover_letter" action={createCoverLetterAction} applications={data.applications} defaultApplicationId={params.application} error={params.error} /></AppPage>;
}
