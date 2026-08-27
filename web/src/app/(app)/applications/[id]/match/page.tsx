import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApplicationMatchWorkspace } from "@/components/applications/application-match-workspace";
import { AppPage } from "@/components/layout/app-page";
import { getApplicationById } from "@/lib/applications/repository";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getGeneratedCoverLetterHistory } from "@/lib/job-intelligence/cover-letters";
import {
  getJobAnalysis,
  getJobMatchHistory,
  getStructuredResumeOptions,
} from "@/lib/job-intelligence/repository";
import { getTailoringRuns } from "@/lib/job-intelligence/tailoring";

export const metadata: Metadata = { title: "Career match" };

export default async function ApplicationMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCurrentUser();
  const { id } = await params;
  const application = await getApplicationById(id);
  if (!application) notFound();

  const [analysis, matches, resumeOptions, tailoringRuns, coverLetters] = await Promise.all([
    getJobAnalysis(id),
    getJobMatchHistory(id),
    getStructuredResumeOptions(id),
    getTailoringRuns(id),
    getGeneratedCoverLetterHistory(id),
  ]);

  return (
    <AppPage size="wide">
      <ApplicationMatchWorkspace
        application={{
          id: application.id,
          companyName: application.companyName,
          jobTitle: application.jobTitle,
          jobUrl: application.jobUrl,
          jobDescription: application.jobDescription,
        }}
        initialAnalysis={analysis}
        initialMatches={matches}
        resumeOptions={resumeOptions}
        initialTailoringRuns={tailoringRuns}
        initialCoverLetters={coverLetters}
      />
    </AppPage>
  );
}
