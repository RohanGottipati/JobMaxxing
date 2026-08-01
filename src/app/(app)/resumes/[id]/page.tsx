import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { deleteMasterResumeAction, duplicateMasterResumeAction, setDefaultResumeAction, updateMasterResumeAction } from "@/app/(app)/documents/actions";
import { DocumentEditor } from "@/components/documents/document-editor";
import { AppPage } from "@/components/layout/app-page";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSignedDocumentUrl, getMasterResume, toEditorModel } from "@/lib/documents/repository";

export const metadata: Metadata = { title: "Resume editor" };

export default async function MasterResumePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const [{ id }, state, user] = await Promise.all([params, searchParams, requireCurrentUser()]);
  const resume = await getMasterResume(id);
  if (!resume) notFound();
  const signedUrl = await createSignedDocumentUrl(resume.file_path);
  return <AppPage><DocumentEditor model={toEditorModel("master_resume", resume)} userId={user.id} signedUrl={signedUrl} saveAction={updateMasterResumeAction.bind(null, id)} duplicateAction={duplicateMasterResumeAction.bind(null, id)} defaultAction={setDefaultResumeAction.bind(null, id)} deleteAction={deleteMasterResumeAction.bind(null, id)} isDefault={resume.is_default} state={state} /></AppPage>;
}
