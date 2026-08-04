import type { Metadata } from "next";

import { AppPage } from "@/components/layout/app-page";
import { ResumeImportForm } from "@/components/resume-imports/resume-import-form";

export const metadata: Metadata = { title: "Import resume" };

export default async function ResumeImportPage({ searchParams }: { searchParams: Promise<{ return?: string }> }) {
  const params = await searchParams;
  return <AppPage size="wide"><ResumeImportForm returnTo={params.return === "onboarding" ? "onboarding" : "resumes"} /></AppPage>;
}

