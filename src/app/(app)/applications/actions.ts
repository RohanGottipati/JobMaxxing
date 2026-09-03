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
  getCoverLetters,
  getResumeVersions,
  markCoverLetterSubmitted,
  markResumeVersionSubmitted,
  reorderApplications,
  updateApplication as updateApplicationRecord,
  type ApplicationReorderItem,
} from "@/lib/applications/packages";
import { getApplicationById } from "@/lib/applications/repository";
import { parseApplicationStatus } from "@/lib/applications/status";
import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import {
  isOwnedApplicationPackagePath,
  safeDocumentFileName,
} from "@/lib/documents/upload-policy";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(formData: FormData, key: string) {
  const value = readText(formData, key);
  return value.length ? value : null;
}

function applicationErrorHref(formData: FormData, error: string) {
  return readText(formData, "form_context") === "mailbox"
    ? `/applications?compose=new&error=${error}`
    : `/applications/new?error=${error}`;
}

function parseApplicationInput(formData: FormData) {
  const companyName = readText(formData, "company_name");
  const jobTitle = readText(formData, "job_title");
  const status = parseApplicationStatus(formData.get("status")) ?? "saved";

  if (!companyName || !jobTitle) return null;

  return {
    company_name: companyName,
    role_title: jobTitle,
    status,
    job_url: readOptionalText(formData, "job_url"),
    location: readOptionalText(formData, "location"),
    date_applied: readOptionalText(formData, "applied_at"),
    deadline: readOptionalText(formData, "deadline"),
    referral_contact: readOptionalText(formData, "referral_contact"),
    next_action: readOptionalText(formData, "next_action"),
    job_description: readOptionalText(formData, "job_description"),
    notes: readOptionalText(formData, "notes"),
  };
}

function readApplicationInput(formData: FormData) {
  const input = parseApplicationInput(formData);
  if (!input) redirect(applicationErrorHref(formData, "missing-required"));
  return input;
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
  try {
    const application = await createApplicationRecord(input);
    revalidatePath("/applications");
    redirect(`/applications?id=${application.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/DUPLICATE_DESCRIPTION:/i.test(message)) {
      redirect(applicationErrorHref(formData, "duplicate-description"));
    }
    throw error;
  }
}

type ComposerCreateResult =
  | { ok: true; applicationId: string }
  | { ok: false; error: "duplicate-description" | "invalid-package" | "missing-required" | "save-failed" };

function uploadedPackagePath(formData: FormData, key: string, userId: string) {
  const value = readOptionalText(formData, key);
  if (!value) return null;
  if (!isOwnedApplicationPackagePath(value, userId)) return false;
  return value;
}

function uploadedPackageTitle(formData: FormData, key: string, fallback: string) {
  const value = readOptionalText(formData, key);
  return safeDocumentFileName(value ?? fallback).slice(0, 160);
}

export async function createApplicationFromComposer(
  formData: FormData,
): Promise<ComposerCreateResult> {
  const input = parseApplicationInput(formData);
  if (!input) return { ok: false, error: "missing-required" };

  const user = await requireCurrentUser();
  const resumePath = uploadedPackagePath(formData, "submitted_resume_path", user.id);
  const coverLetterPath = uploadedPackagePath(
    formData,
    "submitted_cover_letter_path",
    user.id,
  );
  if (resumePath === false || coverLetterPath === false) {
    return { ok: false, error: "invalid-package" };
  }

  const uploadedPaths = [resumePath, coverLetterPath].filter(
    (path): path is string => Boolean(path),
  );
  let applicationId: string | null = null;

  try {
    const application = await createApplicationRecord(input);
    applicationId = application.id;

    if (resumePath) {
      const resume = await createResumeVersion({
        application_id: application.id,
        title: uploadedPackageTitle(formData, "submitted_resume_name", "Submitted resume"),
        content: null,
        file_path: resumePath,
        job_description_snapshot: input.job_description,
      });
      await markResumeVersionSubmitted(resume.id);
    }

    if (coverLetterPath) {
      const coverLetter = await createCoverLetter({
        application_id: application.id,
        title: uploadedPackageTitle(
          formData,
          "submitted_cover_letter_name",
          "Submitted cover letter",
        ),
        content: null,
        file_path: coverLetterPath,
        job_description_snapshot: input.job_description,
      });
      await markCoverLetterSubmitted(coverLetter.id);
    }

    revalidatePath("/applications");
    return { ok: true, applicationId: application.id };
  } catch (error) {
    if (applicationId) {
      try {
        await deleteApplicationRecord(applicationId);
      } catch {
        // The original failure is more useful; storage cleanup below remains best effort.
      }
    }

    if (uploadedPaths.length) {
      const supabase = await createClient();
      await supabase.storage.from(DOCUMENT_BUCKET).remove(uploadedPaths);
    }

    const message = error instanceof Error ? error.message : "";
    return {
      ok: false,
      error: /DUPLICATE_DESCRIPTION:/i.test(message)
        ? "duplicate-description"
        : "save-failed",
    };
  }
}

export async function updateApplication(formData: FormData) {
  const id = readApplicationId(formData);
  const input = readApplicationInput(formData);
  await updateApplicationRecord(id, input);

  revalidatePath("/applications");
  revalidatePath(`/applications/${id}`);
  redirect(`/applications?id=${id}`);
}

export async function deleteApplication(formData: FormData) {
  const id = readApplicationId(formData);
  await deleteApplicationRecord(id);

  revalidatePath("/applications");
  redirect("/applications");
}

/**
 * Persists a batch of status/position changes when cards are dragged on the board.
 * The board updates optimistically, so this only revalidates the cached server data
 * (no redirect) and surfaces failures to the client for rollback.
 */
export async function reorderApplicationsAction(
  updates: ApplicationReorderItem[],
) {
  await reorderApplications(updates);
  revalidatePath("/applications");
}

/**
 * Loads everything saved for one application — core details plus the exact resume
 * versions and cover letters tracked against it — to populate the board's detail drawer.
 */
export async function getApplicationDetails(id: string) {
  const application = await getApplicationById(id);

  if (!application) {
    return null;
  }

  const [resumeVersions, coverLetters] = await Promise.all([
    getResumeVersions(id),
    getCoverLetters(id),
  ]);

  return { application, resumeVersions, coverLetters };
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
