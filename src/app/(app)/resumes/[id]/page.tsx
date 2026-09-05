import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { deleteMasterResumeAction, duplicateMasterResumeAction, setDefaultResumeAction, updateMasterResumeAction } from "@/app/(app)/documents/actions";
import { DocumentEditor } from "@/components/documents/document-editor";
import { StructuredResumeEditor } from "@/components/resumes/structured-resume-editor";
import { AppPage } from "@/components/layout/app-page";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSignedDocumentUrl, getMasterResume, toEditorModel } from "@/lib/documents/repository";
import { getStructuredResume } from "@/lib/resumes/repository";

export const metadata: Metadata = { title: "Resume editor" };

export default async function MasterResumePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const [{ id }, state, user] = await Promise.all([params, searchParams, requireCurrentUser()]);
  const resume = await getMasterResume(id);
  if (!resume) notFound();
  if (resume.editor_mode === "structured") {
    const structured = await getStructuredResume("master", id);
    if (!structured) notFound();
    return <AppPage size="full"><StructuredResumeEditor {...structured} isDefault={resume.is_default} defaultAction={setDefaultResumeAction.bind(null, id)} duplicateAction={duplicateMasterResumeAction.bind(null, id)} deleteAction={deleteMasterResumeAction.bind(null, id)} /></AppPage>;
  }
  const signedUrl = await createSignedDocumentUrl(resume.file_path);
  return <AppPage><DocumentEditor model={toEditorModel("master_resume", resume)} userId={user.id} signedUrl={signedUrl} saveAction={updateMasterResumeAction.bind(null, id)} duplicateAction={duplicateMasterResumeAction.bind(null, id)} defaultAction={setDefaultResumeAction.bind(null, id)} deleteAction={deleteMasterResumeAction.bind(null, id)} isDefault={resume.is_default} state={state} /></AppPage>;
}
