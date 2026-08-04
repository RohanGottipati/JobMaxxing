import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppPage } from "@/components/layout/app-page";
import { ResumeAnalysisWorkspace } from "@/components/resumes/resume-analysis-workspace";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getResumeAnalysisHistory } from "@/lib/resume-analysis/repository";
import { getStructuredResume } from "@/lib/resumes/repository";

export const metadata: Metadata = { title: "Resume review" };

export default async function MasterResumeAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCurrentUser();
  const { id } = await params;
  const [resume, history] = await Promise.all([getStructuredResume("master", id), getResumeAnalysisHistory("master", id)]);
  if (!resume) notFound();
  return <AppPage size="wide"><ResumeAnalysisWorkspace kind="master" resumeId={id} resumeTitle={resume.title} editorHref={`/resumes/${id}`} initialHistory={history} /></AppPage>;
}
