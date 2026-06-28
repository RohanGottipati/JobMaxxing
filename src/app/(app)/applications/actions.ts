"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createApplication as createApplicationRecord,
  createCoverLetter,
  createResumeVersion,
  deleteApplication as deleteApplicationRecord,
  duplicateCoverLetter,
  duplicateResumeVersion,
  markCoverLetterSubmitted,
  markResumeVersionSubmitted,
  updateApplication as updateApplicationRecord,
} from "@/lib/applications/packages";
import type { ApplicationStatus } from "@/lib/applications/package-types";
import { parseApplicationStatus } from "@/lib/applications/status";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(formData: FormData, key: string) {
  const value = readText(formData, key);
  return value.length ? value : null;
}

function readApplicationInput(formData: FormData) {
  const companyName = readText(formData, "company_name");
  const jobTitle = readText(formData, "job_title");
  const status = parseApplicationStatus(formData.get("status")) ?? "saved";

  if (!companyName || !jobTitle) {
    redirect("/applications/new?error=missing-required");
  }

  return {
    company_name: companyName,
    role_title: jobTitle,
    status,
    job_url: readOptionalText(formData, "job_url"),
    location: readOptionalText(formData, "location"),
    date_applied: readOptionalText(formData, "applied_at"),
    job_description: readOptionalText(formData, "job_description"),
    notes: readOptionalText(formData, "notes"),
  };
}

function readApplicationId(formData: FormData) {
  const id = readText(formData, "application_id");

  if (!id) {
    redirect("/applications");
  }

  return id;
}

export async function createApplication(formData: FormData) {
  const input = readApplicationInput(formData);
  const application = await createApplicationRecord(input);

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  redirect(`/applications/${application.id}`);
}

export async function updateApplication(formData: FormData) {
  const id = readApplicationId(formData);
  const input = readApplicationInput(formData);
  await updateApplicationRecord(id, input);

  revalidatePath("/applications");
  revalidatePath(`/applications/${id}`);
  revalidatePath("/dashboard");
  redirect(`/applications/${id}`);
}

export async function deleteApplication(formData: FormData) {
  const id = readApplicationId(formData);
  await deleteApplicationRecord(id);

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  redirect("/applications");
}

/**
 * Persists a status change from the board (drag-and-drop or the inline select).
 */
export async function setApplicationStatus(id: string, status: ApplicationStatus) {
  await updateApplicationRecord(id, { status });
  revalidatePath("/applications");
  revalidatePath(`/applications/${id}`);
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Resume version + cover letter package actions
// ---------------------------------------------------------------------------

export async function addResumeVersion(formData: FormData) {
  const applicationId = readApplicationId(formData);
  await createResumeVersion({
    application_id: applicationId,
    title: readOptionalText(formData, "title"),
    content: readOptionalText(formData, "content"),
  });

  revalidatePath(`/applications/${applicationId}`);
}

export async function markResumeVersionSubmittedAction(formData: FormData) {
  const applicationId = readApplicationId(formData);
  const versionId = readText(formData, "version_id");
  if (versionId) {
    await markResumeVersionSubmitted(versionId);
  }

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/applications");
}

export async function duplicateResumeVersionAction(formData: FormData) {
  const applicationId = readApplicationId(formData);
  const versionId = readText(formData, "version_id");
  if (versionId) {
    await duplicateResumeVersion(versionId);
  }

  revalidatePath(`/applications/${applicationId}`);
}

export async function addCoverLetter(formData: FormData) {
  const applicationId = readApplicationId(formData);
  await createCoverLetter({
    application_id: applicationId,
    title: readOptionalText(formData, "title"),
    content: readOptionalText(formData, "content"),
  });

  revalidatePath(`/applications/${applicationId}`);
}

export async function markCoverLetterSubmittedAction(formData: FormData) {
  const applicationId = readApplicationId(formData);
  const coverLetterId = readText(formData, "cover_letter_id");
  if (coverLetterId) {
    await markCoverLetterSubmitted(coverLetterId);
  }

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/applications");
}

export async function duplicateCoverLetterAction(formData: FormData) {
  const applicationId = readApplicationId(formData);
  const coverLetterId = readText(formData, "cover_letter_id");
  if (coverLetterId) {
    await duplicateCoverLetter(coverLetterId);
  }

  revalidatePath(`/applications/${applicationId}`);
}
