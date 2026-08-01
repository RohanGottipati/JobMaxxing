"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createCoverLetter,
  createResumeVersion,
  duplicateCoverLetter,
  duplicateResumeVersion,
  markCoverLetterSubmitted,
  markResumeVersionSubmitted,
} from "@/lib/applications/packages";
import { getApplicationById } from "@/lib/applications/repository";
import {
  attachDocumentFile,
  createMasterResume,
  deleteCoverLetter,
  deleteMasterResume,
  deleteTailoredResume,
  duplicateMasterResume,
  getMasterResume,
  removeDocumentFile,
  setDefaultResume,
  updateCoverLetter,
  updateMasterResume,
  updateTailoredResume,
} from "@/lib/documents/repository";
import type { DocumentKind } from "@/lib/documents/types";

const requiredTitle = z.string().trim().min(1).max(160);
const optionalText = z.string().trim().max(100_000).transform((value) => value || null);
const optionalId = z
  .string()
  .trim()
  .transform((value) => value || null)
  .refine((value) => value === null || z.string().uuid().safeParse(value).success);

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateDocumentSurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/applications");
  revalidatePath("/resumes");
  revalidatePath("/cover-letters");
}

export async function createMasterResumeAction(formData: FormData) {
  const parsed = z
    .object({ name: requiredTitle, content: optionalText })
    .safeParse({ name: text(formData, "name"), content: text(formData, "content") });
  if (!parsed.success) redirect("/resumes/new?error=invalid");

  const resume = await createMasterResume(parsed.data);
  revalidateDocumentSurfaces();
  redirect(`/resumes/${resume.id}`);
}

export async function updateMasterResumeAction(id: string, formData: FormData) {
  const parsed = z
    .object({ name: requiredTitle, content: optionalText })
    .safeParse({ name: text(formData, "name"), content: text(formData, "content") });
  if (!parsed.success) redirect(`/resumes/${id}?error=invalid`);
  await updateMasterResume(id, parsed.data);
  revalidateDocumentSurfaces();
  revalidatePath(`/resumes/${id}`);
  redirect(`/resumes/${id}?saved=1`);
}

export async function setDefaultResumeAction(id: string) {
  await setDefaultResume(id);
  revalidateDocumentSurfaces();
  revalidatePath(`/resumes/${id}`);
}

export async function duplicateMasterResumeAction(id: string) {
  const duplicate = await duplicateMasterResume(id);
  revalidateDocumentSurfaces();
  redirect(`/resumes/${duplicate.id}`);
}

export async function deleteMasterResumeAction(id: string) {
  await deleteMasterResume(id);
  revalidateDocumentSurfaces();
  redirect("/resumes");
}

export async function createTailoredResumeAction(formData: FormData) {
  const parsed = z
    .object({
      applicationId: z.string().uuid(),
      baseResumeId: optionalId,
      title: requiredTitle,
      content: optionalText,
    })
    .safeParse({
      applicationId: text(formData, "application_id"),
      baseResumeId: text(formData, "base_resume_id"),
      title: text(formData, "title"),
      content: text(formData, "content"),
    });
  if (!parsed.success) redirect("/resumes/versions/new?error=invalid");

  const application = await getApplicationById(parsed.data.applicationId);
  if (!application) redirect("/resumes/versions/new?error=application");
  if (parsed.data.baseResumeId) {
    const base = await getMasterResume(parsed.data.baseResumeId);
    if (!base) redirect("/resumes/versions/new?error=resume");
  }

  const version = await createResumeVersion({
    application_id: parsed.data.applicationId,
    base_resume_id: parsed.data.baseResumeId,
    title: parsed.data.title,
    content: parsed.data.content,
    job_description_snapshot: application.jobDescription,
  });
  revalidateDocumentSurfaces();
  redirect(`/resumes/versions/${version.id}`);
}

export async function updateTailoredResumeAction(id: string, formData: FormData) {
  const parsed = z
    .object({ baseResumeId: optionalId, title: requiredTitle, content: optionalText })
    .safeParse({
      baseResumeId: text(formData, "base_resume_id"),
      title: text(formData, "title"),
      content: text(formData, "content"),
    });
  if (!parsed.success) redirect(`/resumes/versions/${id}?error=invalid`);
  if (parsed.data.baseResumeId) {
    const base = await getMasterResume(parsed.data.baseResumeId);
    if (!base) redirect(`/resumes/versions/${id}?error=resume`);
  }
  await updateTailoredResume(id, {
    title: parsed.data.title,
    content: parsed.data.content,
    base_resume_id: parsed.data.baseResumeId,
  });
  revalidateDocumentSurfaces();
  revalidatePath(`/resumes/versions/${id}`);
  redirect(`/resumes/versions/${id}?saved=1`);
}

export async function duplicateTailoredResumeAction(id: string) {
  const duplicate = await duplicateResumeVersion(id);
  revalidateDocumentSurfaces();
  redirect(`/resumes/versions/${duplicate.id}`);
}

export async function submitTailoredResumeAction(id: string) {
  const version = await markResumeVersionSubmitted(id);
  revalidateDocumentSurfaces();
  revalidatePath(`/applications/${version.application_id}`);
  revalidatePath(`/resumes/versions/${id}`);
}

export async function deleteTailoredResumeAction(id: string) {
  await deleteTailoredResume(id);
  revalidateDocumentSurfaces();
  redirect("/resumes?tab=tailored");
}

export async function createCoverLetterAction(formData: FormData) {
  const parsed = z
    .object({ applicationId: z.string().uuid(), title: requiredTitle, content: optionalText })
    .safeParse({
      applicationId: text(formData, "application_id"),
      title: text(formData, "title"),
      content: text(formData, "content"),
    });
  if (!parsed.success) redirect("/cover-letters/new?error=invalid");

  const application = await getApplicationById(parsed.data.applicationId);
  if (!application) redirect("/cover-letters/new?error=application");

  const letter = await createCoverLetter({
    application_id: parsed.data.applicationId,
    title: parsed.data.title,
    content: parsed.data.content,
    job_description_snapshot: application.jobDescription,
  });
  revalidateDocumentSurfaces();
  redirect(`/cover-letters/${letter.id}`);
}

export async function updateCoverLetterAction(id: string, formData: FormData) {
  const parsed = z
    .object({ title: requiredTitle, content: optionalText })
    .safeParse({ title: text(formData, "title"), content: text(formData, "content") });
  if (!parsed.success) redirect(`/cover-letters/${id}?error=invalid`);
  await updateCoverLetter(id, parsed.data);
  revalidateDocumentSurfaces();
  revalidatePath(`/cover-letters/${id}`);
  redirect(`/cover-letters/${id}?saved=1`);
}

export async function duplicateCoverLetterDocumentAction(id: string) {
  const duplicate = await duplicateCoverLetter(id);
  revalidateDocumentSurfaces();
  redirect(`/cover-letters/${duplicate.id}`);
}

export async function submitCoverLetterDocumentAction(id: string) {
  const letter = await markCoverLetterSubmitted(id);
  revalidateDocumentSurfaces();
  revalidatePath(`/applications/${letter.application_id}`);
  revalidatePath(`/cover-letters/${id}`);
}

export async function deleteCoverLetterDocumentAction(id: string) {
  await deleteCoverLetter(id);
  revalidateDocumentSurfaces();
  redirect("/cover-letters");
}

export async function attachDocumentFileAction(
  kind: DocumentKind,
  id: string,
  path: string,
) {
  try {
    await attachDocumentFile(kind, id, path);
    revalidateDocumentSurfaces();
    return { success: true, message: "File attached." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not attach file.",
    };
  }
}

export async function removeDocumentFileAction(kind: DocumentKind, id: string) {
  try {
    await removeDocumentFile(kind, id);
    revalidateDocumentSurfaces();
    return { success: true, message: "File removed." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not remove file.",
    };
  }
}
