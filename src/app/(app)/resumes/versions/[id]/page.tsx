import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { deleteTailoredResumeAction, duplicateTailoredResumeAction, submitTailoredResumeAction, updateTailoredResumeAction } from "@/app/(app)/documents/actions";
import { DocumentEditor } from "@/components/documents/document-editor";
import { StructuredResumeEditor } from "@/components/resumes/structured-resume-editor";
import { AppPage } from "@/components/layout/app-page";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSignedDocumentUrl, getDocumentLibraryData, getTailoredResume, toEditorModel } from "@/lib/documents/repository";
import { getStructuredResume } from "@/lib/resumes/repository";

export const metadata: Metadata = { title: "Tailored resume" };

export default async function TailoredResumePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const [{ id }, state, user] = await Promise.all([params, searchParams, requireCurrentUser()]);
  const [resume, library] = await Promise.all([getTailoredResume(id), getDocumentLibraryData()]);
  if (!resume) notFound();
  if (resume.editor_mode === "structured") {
    const structured = await getStructuredResume("tailored", id);
    if (!structured) notFound();
    return <AppPage size="full"><StructuredResumeEditor {...structured} duplicateAction={duplicateTailoredResumeAction.bind(null, id)} submitAction={submitTailoredResumeAction.bind(null, id)} deleteAction={deleteTailoredResumeAction.bind(null, id)} /></AppPage>;
  }
  const signedUrl = await createSignedDocumentUrl(resume.file_path);
  return <AppPage><DocumentEditor model={toEditorModel("resume_version", resume)} userId={user.id} signedUrl={signedUrl} masterResumes={library.masterResumes} saveAction={updateTailoredResumeAction.bind(null, id)} duplicateAction={duplicateTailoredResumeAction.bind(null, id)} submitAction={submitTailoredResumeAction.bind(null, id)} deleteAction={deleteTailoredResumeAction.bind(null, id)} state={state} /></AppPage>;
}
