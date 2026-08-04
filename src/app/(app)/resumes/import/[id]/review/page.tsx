import { notFound, redirect } from "next/navigation";

import { AppPage } from "@/components/layout/app-page";
import { ResumeImportReview } from "@/components/resume-imports/resume-import-review";
import { resumeImportResultSchema, resumeImportReviewSchema } from "@/lib/resume-imports/schemas";
import { getImportReviewData } from "@/lib/resume-imports/repository";

export default async function ResumeImportReviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ return?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const data = await getImportReviewData(id);
  if (!data) notFound();
  if (data.row.status === "committed" && data.row.committed_resume_id) redirect(`/resumes/${data.row.committed_resume_id}`);
  if (data.row.status !== "review_required" || !data.row.parsed_payload) redirect(`/resumes/import?error=${encodeURIComponent(data.row.error_code ?? "not-ready")}`);
  const parsed = resumeImportResultSchema.parse(data.row.parsed_payload);
  const savedReview = resumeImportReviewSchema.safeParse(data.row.review_payload);
  return <AppPage size="full"><ResumeImportReview importId={id} sourceText={data.row.source_text ?? ""} fileName={data.row.file_name} signedUrl={data.signedUrl} parsed={{ ...parsed, profile: savedReview.success ? savedReview.data.profile : parsed.profile }} initialDuplicateDecisions={savedReview.success ? savedReview.data.duplicateDecisions : {}} initialResumeName={savedReview.success ? savedReview.data.resumeName : undefined} initialTemplateId={savedReview.success ? savedReview.data.templateId : undefined} returnTo={query.return === "onboarding" ? "onboarding" : "resumes"} /></AppPage>;
}
