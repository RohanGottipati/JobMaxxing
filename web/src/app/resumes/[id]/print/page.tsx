import { notFound } from "next/navigation";

import { PrintToolbar } from "@/components/resumes/print-toolbar";
import { ResumePrintDocument } from "@/components/resumes/resume-print-document";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createResumeRenderModel } from "@/lib/resumes/render-model";
import { getStructuredResumeForExport } from "@/lib/resumes/repository";

export default async function MasterResumePrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCurrentUser();
  const { id } = await params;
  const resume = await loadResume(id);
  if (!resume) notFound();
  return <main className="min-h-dvh bg-neutral-200 pb-8"><PrintToolbar backHref={`/resumes/${id}`} /><ResumePrintDocument model={createResumeRenderModel(resume.document, resume.profile)} /></main>;
}

async function loadResume(id: string) {
  try {
    return await getStructuredResumeForExport("master", id);
  } catch {
    return null;
  }
}
