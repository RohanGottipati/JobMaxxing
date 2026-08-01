import { createClient } from "@/lib/supabase/server";
import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import type {
  Application,
  ApplicationInsert,
  ApplicationPackage,
  ApplicationStatus,
  ApplicationUpdate,
  CoverLetter,
  CoverLetterInsert,
  Resume,
  ResumeInsert,
  ResumeVersion,
  ResumeVersionInsert,
} from "@/lib/applications/package-types";

/**
 * Resolves the Supabase server client together with the authenticated user.
 * Every helper below scopes its work to this user — IDs are never hardcoded and
 * Row Level Security enforces ownership as a second line of defence.
 */
async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be signed in to manage applications.");
  }

  return { supabase, userId: user.id };
}

// ----------------------------------------------------------------------------
// Applications
// ----------------------------------------------------------------------------

export type CreateApplicationInput = Omit<
  ApplicationInsert,
  | "id"
  | "user_id"
  | "created_at"
  | "updated_at"
  | "submitted_resume_version_id"
  | "submitted_cover_letter_id"
>;

export type UpdateApplicationInput = Omit<
  ApplicationUpdate,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export async function createApplication(
  input: CreateApplicationInput,
): Promise<Application> {
  const { supabase, userId } = await getAuthContext();

  const { data, error } = await supabase
    .from("applications")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateApplication(
  id: string,
  input: UpdateApplicationInput,
): Promise<Application> {
  const { supabase, userId } = await getAuthContext();

  const { data, error } = await supabase
    .from("applications")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteApplication(id: string): Promise<void> {
  const { supabase, userId } = await getAuthContext();

  const [resumeFiles, coverLetterFiles] = await Promise.all([
    supabase
      .from("resume_versions")
      .select("file_path")
      .eq("application_id", id)
      .eq("user_id", userId)
      .not("file_path", "is", null),
    supabase
      .from("cover_letters")
      .select("file_path")
      .eq("application_id", id)
      .eq("user_id", userId)
      .not("file_path", "is", null),
  ]);

  if (resumeFiles.error) throw resumeFiles.error;
  if (coverLetterFiles.error) throw coverLetterFiles.error;

  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;

  const filePaths = [
    ...(resumeFiles.data ?? []),
    ...(coverLetterFiles.data ?? []),
  ]
    .map((document) => document.file_path)
    .filter((path): path is string => Boolean(path));

  if (filePaths.length) {
    // The database deletion is authoritative. Storage cleanup is best-effort so a
    // transient object-store failure cannot make a completed deletion look retryable.
    await supabase.storage.from(DOCUMENT_BUCKET).remove(filePaths);
  }
}

export async function getApplications(): Promise<Application[]> {
  const { supabase } = await getAuthContext();

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .order("status", { ascending: true })
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export type ApplicationReorderItem = {
  id: string;
  status: ApplicationStatus;
  position: number;
};

/**
 * Persists a batch of status/position changes from the board in a single transaction.
 * Backed by the `reorder_applications` RPC, which is scoped to the authenticated user.
 */
export async function reorderApplications(
  updates: ApplicationReorderItem[],
): Promise<void> {
  if (updates.length === 0) {
    return;
  }

  const { supabase } = await getAuthContext();

  const { error } = await supabase.rpc("reorder_applications", {
    p_updates: updates,
  });

  if (error) throw error;
}

/**
 * Fetches the full package for a single application — application details plus the
 * exact submitted resume version and cover letter — from the application_packages view.
 */
export async function getApplicationPackage(
  applicationId: string,
): Promise<ApplicationPackage | null> {
  const { supabase } = await getAuthContext();

  const { data, error } = await supabase
    .from("application_packages")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ----------------------------------------------------------------------------
// Base resumes
// ----------------------------------------------------------------------------

export type CreateBaseResumeInput = Omit<
  ResumeInsert,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export async function createBaseResume(
  input: CreateBaseResumeInput,
): Promise<Resume> {
  const { supabase, userId } = await getAuthContext();

  const { data, error } = await supabase
    .from("resumes")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// ----------------------------------------------------------------------------
// Resume versions
// ----------------------------------------------------------------------------

export type CreateResumeVersionInput = Omit<
  ResumeVersionInsert,
  | "id"
  | "user_id"
  | "version_number"
  | "is_submitted"
  | "submitted_at"
  | "created_at"
  | "updated_at"
>;

/**
 * Creates a tailored resume version for an application. The next version number is
 * assigned automatically by a database trigger, so it is intentionally omitted here.
 */
export async function createResumeVersion(
  input: CreateResumeVersionInput,
): Promise<ResumeVersion> {
  const { supabase, userId } = await getAuthContext();

  const { data, error } = await supabase
    .from("resume_versions")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getResumeVersions(
  applicationId: string,
): Promise<ResumeVersion[]> {
  const { supabase } = await getAuthContext();

  const { data, error } = await supabase
    .from("resume_versions")
    .select("*")
    .eq("application_id", applicationId)
    .order("version_number", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Marks a resume version as the submitted package document. The underlying RPC unsets
 * any previously submitted version for the same application and updates the application
 * pointer, all in a single transaction.
 */
export async function markResumeVersionSubmitted(
  versionId: string,
): Promise<ResumeVersion> {
  const { supabase } = await getAuthContext();

  const { data, error } = await supabase.rpc("submit_resume_version", {
    p_version_id: versionId,
  });

  if (error) throw error;
  return data;
}

/**
 * Duplicates a (typically submitted, and therefore locked) resume version into a fresh,
 * editable version on the same application so the original submitted copy is preserved.
 */
export async function duplicateResumeVersion(
  versionId: string,
): Promise<ResumeVersion> {
  const { supabase, userId } = await getAuthContext();

  const { data: source, error: readError } = await supabase
    .from("resume_versions")
    .select("*")
    .eq("id", versionId)
    .single();

  if (readError) throw readError;

  const { data, error } = await supabase
    .from("resume_versions")
    .insert({
      user_id: userId,
      application_id: source.application_id,
      base_resume_id: source.base_resume_id,
      title: source.title ? `${source.title} (copy)` : null,
      content: source.content,
      // Storage objects are never shared between records. A duplicated document
      // keeps its editable text and can receive its own private attachment.
      file_path: null,
      rules_used: source.rules_used,
      job_description_snapshot: source.job_description_snapshot,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// ----------------------------------------------------------------------------
// Cover letters
// ----------------------------------------------------------------------------

export type CreateCoverLetterInput = Omit<
  CoverLetterInsert,
  | "id"
  | "user_id"
  | "version_number"
  | "is_submitted"
  | "submitted_at"
  | "created_at"
  | "updated_at"
>;

/**
 * Creates a cover letter version for an application. The next version number is assigned
 * automatically by a database trigger, so it is intentionally omitted here.
 */
export async function createCoverLetter(
  input: CreateCoverLetterInput,
): Promise<CoverLetter> {
  const { supabase, userId } = await getAuthContext();

  const { data, error } = await supabase
    .from("cover_letters")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getCoverLetters(
  applicationId: string,
): Promise<CoverLetter[]> {
  const { supabase } = await getAuthContext();

  const { data, error } = await supabase
    .from("cover_letters")
    .select("*")
    .eq("application_id", applicationId)
    .order("version_number", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Marks a cover letter as the submitted package document. The underlying RPC unsets any
 * previously submitted cover letter for the same application and updates the application
 * pointer, all in a single transaction.
 */
export async function markCoverLetterSubmitted(
  coverLetterId: string,
): Promise<CoverLetter> {
  const { supabase } = await getAuthContext();

  const { data, error } = await supabase.rpc("submit_cover_letter", {
    p_cover_letter_id: coverLetterId,
  });

  if (error) throw error;
  return data;
}

/**
 * Duplicates a (typically submitted, and therefore locked) cover letter into a fresh,
 * editable version on the same application so the original submitted copy is preserved.
 */
export async function duplicateCoverLetter(
  coverLetterId: string,
): Promise<CoverLetter> {
  const { supabase, userId } = await getAuthContext();

  const { data: source, error: readError } = await supabase
    .from("cover_letters")
    .select("*")
    .eq("id", coverLetterId)
    .single();

  if (readError) throw readError;

  const { data, error } = await supabase
    .from("cover_letters")
    .insert({
      user_id: userId,
      application_id: source.application_id,
      title: source.title ? `${source.title} (copy)` : null,
      content: source.content,
      file_path: null,
      template_used: source.template_used,
      job_description_snapshot: source.job_description_snapshot,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
