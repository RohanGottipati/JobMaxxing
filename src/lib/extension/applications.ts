import "server-only";

import { z } from "zod";

import { hashJobDescription } from "@/lib/applications/description-hash";
import type {
  Application,
  ApplicationStatus,
  ApplicationUpdate,
} from "@/lib/applications/package-types";
import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import {
  documentContentType,
  isOwnedApplicationPackagePath,
  validateDocumentFile,
} from "@/lib/documents/upload-policy";
import { analyzeApplicationJob } from "@/lib/job-intelligence/repository";
import type { AuthContext } from "@/lib/supabase/request-client";
import type { Json } from "@/types/database";

const extensionStatusSchema = z.enum([
  "saved",
  "applied",
  "online_assessment",
  "interview",
  "final_round",
  "offer",
  "rejected",
  "withdrawn",
]);

export const extensionApplicationSchema = z.object({
  id: z.uuid().optional(),
  companyName: z.string().trim().min(1).max(200),
  roleTitle: z.string().trim().min(1).max(200),
  jobUrl: z.string().trim().max(2000).optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  dateApplied: z.string().date().optional().nullable(),
  deadline: z.string().date().optional().nullable(),
  nextAction: z.string().trim().max(500).optional().nullable(),
  status: extensionStatusSchema.optional(),
  jobDescription: z.string().trim().max(200_000).optional().nullable(),
  notes: z.string().trim().max(10_000).optional().nullable(),
  referralContact: z.string().trim().max(500).optional().nullable(),
  sourceHost: z.string().trim().max(200).optional().nullable(),
  recruitingSeason: z.string().trim().max(100).optional().nullable(),
});

export type ExtensionApplicationInput = z.infer<typeof extensionApplicationSchema>;

export const extensionApplicationUpdateSchema = extensionApplicationSchema
  .partial()
  .extend({ id: z.uuid() });

export type ExtensionApplicationUpdate = z.infer<typeof extensionApplicationUpdateSchema>;

export const extensionSubmittedFileSchema = z.object({
  path: z.string().trim().min(1).max(1_000),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
});

const submittedFilesSchema = z
  .object({
    resume: extensionSubmittedFileSchema.optional(),
    coverLetter: extensionSubmittedFileSchema.optional(),
  })
  .optional();

export const extensionApplicationPackageSchema = extensionApplicationSchema.extend({
  submittedFiles: submittedFilesSchema,
});

export const extensionApplicationPackageUpdateSchema =
  extensionApplicationPackageSchema.partial().extend({ id: z.uuid() });

export type ExtensionApplicationPackageInput = z.infer<
  typeof extensionApplicationPackageSchema
>;
export type ExtensionApplicationPackageUpdate = z.infer<
  typeof extensionApplicationPackageUpdateSchema
>;

export function toExtensionApplication(row: {
  id: string;
  company_name: string;
  role_title: string;
  job_url: string | null;
  location: string | null;
  status: ApplicationStatus;
  date_applied: string | null;
  deadline: string | null;
  next_action: string | null;
  job_description: string | null;
  notes: string | null;
  referral_contact: string | null;
  submitted_resume_version_id: string | null;
  submitted_cover_letter_id: string | null;
  source_host: string | null;
  recruiting_season: string | null;
  description_hash: string | null;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: row.id,
    companyName: row.company_name,
    roleTitle: row.role_title,
    jobUrl: row.job_url,
    location: row.location,
    status: row.status,
    dateApplied: row.date_applied,
    deadline: row.deadline,
    nextAction: row.next_action,
    jobDescription: row.job_description,
    notes: row.notes,
    referralContact: row.referral_contact,
    submittedResumeVersionId: row.submitted_resume_version_id,
    submittedCoverLetterId: row.submitted_cover_letter_id,
    sourceHost: row.source_host,
    recruitingSeason: row.recruiting_season,
    descriptionHash: row.description_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSummary(row: {
  id: string;
  company_name: string;
  role_title: string;
  status: ApplicationStatus;
  date_applied: string | null;
  updated_at: string;
  job_url?: string | null;
  source_host?: string | null;
  recruiting_season?: string | null;
  description_hash?: string | null;
}) {
  return {
    id: row.id,
    companyName: row.company_name,
    roleTitle: row.role_title,
    status: row.status,
    dateApplied: row.date_applied,
    updatedAt: row.updated_at,
    jobUrl: row.job_url ?? null,
    sourceHost: row.source_host ?? null,
    recruitingSeason: row.recruiting_season ?? null,
    descriptionHash: row.description_hash ?? null,
  };
}

export async function findDuplicateByDescriptionHash(
  auth: AuthContext,
  descriptionHash: string,
  excludeId?: string,
) {
  let query = auth.supabase
    .from("applications")
    .select("id, company_name, role_title, status")
    .eq("user_id", auth.userId)
    .eq("description_hash", descriptionHash)
    .limit(1);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertExtensionApplication(
  auth: AuthContext,
  input: ExtensionApplicationInput,
) {
  const parsed = extensionApplicationSchema.parse(input);
  const descriptionHash = parsed.jobDescription
    ? hashJobDescription(parsed.jobDescription)
    : null;

  if (descriptionHash) {
    const duplicate = await findDuplicateByDescriptionHash(
      auth,
      descriptionHash,
      parsed.id,
    );
    if (duplicate) {
      return {
        application: null,
        duplicate: {
          id: duplicate.id,
          companyName: duplicate.company_name,
          roleTitle: duplicate.role_title,
          status: duplicate.status,
        },
      };
    }
  }

  const row = {
    user_id: auth.userId,
    company_name: parsed.companyName,
    role_title: parsed.roleTitle,
    job_url: parsed.jobUrl ?? null,
    location: parsed.location ?? null,
    date_applied: parsed.dateApplied ?? null,
    deadline: parsed.deadline ?? null,
    next_action: parsed.nextAction ?? null,
    status: parsed.status ?? "saved",
    job_description: parsed.jobDescription ?? null,
    notes: parsed.notes ?? null,
    referral_contact: parsed.referralContact ?? null,
    source_host: parsed.sourceHost ?? null,
    recruiting_season: parsed.recruitingSeason ?? null,
    description_hash: descriptionHash,
  };

  if (parsed.id) {
    const { data, error } = await auth.supabase
      .from("applications")
      .update(row)
      .eq("id", parsed.id)
      .eq("user_id", auth.userId)
      .select("*")
      .single();
    if (error) throw error;
    return { application: data, duplicate: null };
  }

  const { data, error } = await auth.supabase
    .from("applications")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return { application: data, duplicate: null };
}

export async function getExtensionApplications(
  auth: AuthContext,
  options: { limit?: number; full?: boolean } = {},
) {
  const full = options.full ?? false;
  let query = auth.supabase
    .from("applications")
    .select(
      full
        ? "*"
        : "id, company_name, role_title, status, date_applied, updated_at, job_url, source_host, recruiting_season, description_hash",
    )
    .eq("user_id", auth.userId)
    .order("updated_at", { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => {
    const application = row as unknown as Application;
    return full ? toExtensionApplication(application) : toSummary(application);
  });
}

export async function getExtensionApplication(auth: AuthContext, id: string) {
  const { data, error } = await auth.supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (error) throw error;
  return data ? toExtensionApplication(data) : null;
}

export async function updateExtensionApplication(
  auth: AuthContext,
  input: ExtensionApplicationUpdate,
) {
  const parsed = extensionApplicationUpdateSchema.parse(input);
  const existing = await getExtensionApplication(auth, parsed.id);
  if (!existing) throw new Error("Application not found.");

  const jobDescription =
    parsed.jobDescription !== undefined
      ? parsed.jobDescription
      : existing.jobDescription;
  const descriptionHash = jobDescription
    ? hashJobDescription(jobDescription)
    : null;

  if (descriptionHash) {
    const duplicate = await findDuplicateByDescriptionHash(
      auth,
      descriptionHash,
      parsed.id,
    );
    if (duplicate) {
      return {
        application: null,
        duplicate: {
          id: duplicate.id,
          companyName: duplicate.company_name,
          roleTitle: duplicate.role_title,
          status: duplicate.status,
        },
      };
    }
  }

  const row: ApplicationUpdate = { id: parsed.id };
  if (parsed.companyName !== undefined) row.company_name = parsed.companyName;
  if (parsed.roleTitle !== undefined) row.role_title = parsed.roleTitle;
  if (parsed.jobUrl !== undefined) row.job_url = parsed.jobUrl;
  if (parsed.location !== undefined) row.location = parsed.location;
  if (parsed.dateApplied !== undefined) row.date_applied = parsed.dateApplied;
  if (parsed.deadline !== undefined) row.deadline = parsed.deadline;
  if (parsed.nextAction !== undefined) row.next_action = parsed.nextAction;
  if (parsed.status !== undefined) row.status = parsed.status;
  if (parsed.jobDescription !== undefined) row.job_description = parsed.jobDescription;
  if (parsed.notes !== undefined) row.notes = parsed.notes;
  if (parsed.referralContact !== undefined) row.referral_contact = parsed.referralContact;
  if (parsed.sourceHost !== undefined) row.source_host = parsed.sourceHost;
  if (parsed.recruitingSeason !== undefined) row.recruiting_season = parsed.recruitingSeason;
  if (parsed.jobDescription !== undefined) row.description_hash = descriptionHash;

  const { data, error } = await auth.supabase
    .from("applications")
    .update(row)
    .eq("id", parsed.id)
    .eq("user_id", auth.userId)
    .select("*")
    .single();
  if (error) throw error;
  return { application: toExtensionApplication(data), duplicate: null };
}

type SubmittedFile = z.infer<typeof extensionSubmittedFileSchema>;

function submittedFileList(input: {
  submittedFiles?: { resume?: SubmittedFile; coverLetter?: SubmittedFile };
}) {
  return [input.submittedFiles?.resume, input.submittedFiles?.coverLetter].filter(
    (file): file is SubmittedFile => Boolean(file),
  );
}

async function cleanupSubmittedFiles(
  auth: AuthContext,
  input: { submittedFiles?: { resume?: SubmittedFile; coverLetter?: SubmittedFile } },
) {
  const paths = submittedFileList(input)
    .map((file) => file.path)
    .filter((path) => isOwnedApplicationPackagePath(path, auth.userId));
  if (paths.length) {
    await auth.supabase.storage.from(DOCUMENT_BUCKET).remove(paths);
  }
}

async function verifySubmittedFile(
  auth: AuthContext,
  file: SubmittedFile,
) {
  if (!isOwnedApplicationPackagePath(file.path, auth.userId)) {
    throw new Error("Invalid application package path.");
  }

  const expectedContentType = documentContentType({
    name: file.fileName,
    type: file.mimeType,
  });
  const validationError = validateDocumentFile({
    name: file.fileName,
    type: file.mimeType,
    size: file.sizeBytes,
  });
  if (!expectedContentType || validationError) {
    throw new Error(validationError ?? "Invalid application package file.");
  }

  // A successful info() call also proves ownership because the bucket's SELECT
  // policy requires both the user-scoped folder and owner_id = auth.uid().
  const { data, error } = await auth.supabase.storage
    .from(DOCUMENT_BUCKET)
    .info(file.path);
  if (error || !data) throw error ?? new Error("Uploaded document was not found.");

  if (
    data.size !== file.sizeBytes ||
    data.contentType?.split(";", 1)[0]?.toLocaleLowerCase() !== expectedContentType
  ) {
    throw new Error("Uploaded document metadata does not match the selected file.");
  }
}

async function completePackageInput(
  auth: AuthContext,
  input: ExtensionApplicationPackageInput | ExtensionApplicationPackageUpdate,
): Promise<ExtensionApplicationPackageInput> {
  if (!input.id) return extensionApplicationPackageSchema.parse(input);

  const existing = await getExtensionApplication(auth, input.id);
  if (!existing) throw new Error("Application not found.");
  const next = <T>(value: T | undefined, fallback: T) =>
    value === undefined ? fallback : value;

  return extensionApplicationPackageSchema.parse({
    id: input.id,
    companyName: next(input.companyName, existing.companyName),
    roleTitle: next(input.roleTitle, existing.roleTitle),
    jobUrl: next(input.jobUrl, existing.jobUrl),
    location: next(input.location, existing.location),
    dateApplied: next(input.dateApplied, existing.dateApplied),
    deadline: next(input.deadline, existing.deadline),
    nextAction: next(input.nextAction, existing.nextAction),
    status: next(input.status, existing.status),
    jobDescription: next(input.jobDescription, existing.jobDescription),
    notes: next(input.notes, existing.notes),
    referralContact: next(input.referralContact, existing.referralContact),
    sourceHost: next(input.sourceHost, existing.sourceHost),
    recruitingSeason: next(input.recruitingSeason, existing.recruitingSeason),
    submittedFiles: input.submittedFiles,
  });
}

export async function saveExtensionApplicationPackage(
  auth: AuthContext,
  input: ExtensionApplicationPackageInput | ExtensionApplicationPackageUpdate,
) {
  let parsed: ExtensionApplicationPackageInput;
  try {
    parsed = await completePackageInput(auth, input);
  } catch (error) {
    // PATCH callers upload package files before saving. If the target vanished
    // or the completed payload is invalid, those new objects are still safe to
    // remove because no document row has referenced them yet.
    await cleanupSubmittedFiles(auth, input);
    throw error;
  }

  try {
    await Promise.all(
      submittedFileList(parsed).map((file) => verifySubmittedFile(auth, file)),
    );
  } catch (error) {
    await cleanupSubmittedFiles(auth, parsed);
    throw error;
  }

  const descriptionHash = parsed.jobDescription
    ? hashJobDescription(parsed.jobDescription)
    : null;
  const submittedFiles = parsed.submittedFiles
    ? {
        ...(parsed.submittedFiles.resume
          ? {
              resume: {
                path: parsed.submittedFiles.resume.path,
                file_name: parsed.submittedFiles.resume.fileName,
              },
            }
          : {}),
        ...(parsed.submittedFiles.coverLetter
          ? {
              cover_letter: {
                path: parsed.submittedFiles.coverLetter.path,
                file_name: parsed.submittedFiles.coverLetter.fileName,
              },
            }
          : {}),
      }
    : undefined;

  const payload: Json = {
    ...(parsed.id ? { id: parsed.id } : {}),
    company_name: parsed.companyName,
    role_title: parsed.roleTitle,
    job_url: parsed.jobUrl ?? null,
    location: parsed.location ?? null,
    date_applied: parsed.dateApplied ?? null,
    deadline: parsed.deadline ?? null,
    next_action: parsed.nextAction ?? null,
    status: parsed.status ?? "applied",
    job_description: parsed.jobDescription ?? null,
    notes: parsed.notes ?? null,
    referral_contact: parsed.referralContact ?? null,
    source_host: parsed.sourceHost ?? null,
    recruiting_season: parsed.recruitingSeason ?? null,
    description_hash: descriptionHash,
    ...(submittedFiles ? { submitted_files: submittedFiles } : {}),
  };

  const { data, error } = await auth.supabase.rpc(
    "save_extension_application_package",
    { p_payload: payload },
  );
  if (error) {
    await cleanupSubmittedFiles(auth, parsed);
    throw error;
  }

  const result = data as {
    duplicate_found?: boolean;
    application_id?: string;
    submitted_resume_version_id?: string | null;
    submitted_cover_letter_id?: string | null;
    duplicate?: {
      id: string;
      company_name: string;
      role_title: string;
      status: ApplicationStatus;
    };
  };
  if (result.duplicate_found && result.duplicate) {
    await cleanupSubmittedFiles(auth, parsed);
    return {
      application: null,
      duplicate: {
        id: result.duplicate.id,
        companyName: result.duplicate.company_name,
        roleTitle: result.duplicate.role_title,
        status: result.duplicate.status,
      },
      package: null,
    };
  }

  if (!result.application_id) {
    await cleanupSubmittedFiles(auth, parsed);
    throw new Error("Application package was not saved.");
  }
  const application = await getExtensionApplication(auth, result.application_id);
  if (!application) throw new Error("Saved application was not found.");

  return {
    application,
    duplicate: null,
    package: {
      submittedResumeVersionId:
        result.submitted_resume_version_id ?? application.submittedResumeVersionId,
      submittedCoverLetterId:
        result.submitted_cover_letter_id ?? application.submittedCoverLetterId,
    },
  };
}

async function extensionApplicationDocumentPaths(
  auth: AuthContext,
  applicationId?: string,
) {
  let resumeQuery = auth.supabase
    .from("resume_versions")
    .select("file_path")
    .eq("user_id", auth.userId)
    .not("file_path", "is", null);
  let coverLetterQuery = auth.supabase
    .from("cover_letters")
    .select("file_path")
    .eq("user_id", auth.userId)
    .not("file_path", "is", null);

  if (applicationId) {
    resumeQuery = resumeQuery.eq("application_id", applicationId);
    coverLetterQuery = coverLetterQuery.eq("application_id", applicationId);
  }

  const [resumeFiles, coverLetterFiles] = await Promise.all([
    resumeQuery,
    coverLetterQuery,
  ]);
  if (resumeFiles.error) throw resumeFiles.error;
  if (coverLetterFiles.error) throw coverLetterFiles.error;

  return [...(resumeFiles.data ?? []), ...(coverLetterFiles.data ?? [])]
    .map((document) => document.file_path)
    .filter((path): path is string => Boolean(path));
}

async function removeExtensionApplicationDocuments(
  auth: AuthContext,
  paths: string[],
) {
  const uniquePaths = [...new Set(paths)];
  if (!uniquePaths.length) return;
  // The database deletion is authoritative. Storage cleanup is best-effort so
  // a transient object-store failure does not make a completed delete retryable.
  for (let offset = 0; offset < uniquePaths.length; offset += 1_000) {
    await auth.supabase.storage
      .from(DOCUMENT_BUCKET)
      .remove(uniquePaths.slice(offset, offset + 1_000));
  }
}

export async function deleteExtensionApplication(auth: AuthContext, id: string) {
  const paths = await extensionApplicationDocumentPaths(auth, id);
  const { error } = await auth.supabase
    .from("applications")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);
  if (error) throw error;
  await removeExtensionApplicationDocuments(auth, paths);
}

export async function deleteAllExtensionApplications(auth: AuthContext) {
  const paths = await extensionApplicationDocumentPaths(auth);
  const { error } = await auth.supabase
    .from("applications")
    .delete()
    .eq("user_id", auth.userId);
  if (error) throw error;
  await removeExtensionApplicationDocuments(auth, paths);
}

export async function getRecentExtensionApplications(
  auth: AuthContext,
  limit = 10,
) {
  const { data, error } = await auth.supabase
    .from("applications")
    .select("id, company_name, role_title, status, date_applied, updated_at, job_url")
    .eq("user_id", auth.userId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toSummary);
}

export async function analyzeExtensionApplication(
  auth: AuthContext,
  applicationId: string,
  sourceText?: string,
) {
  return analyzeApplicationJob(applicationId, sourceText, auth);
}

export async function getExtensionAiConsent(auth: AuthContext) {
  const { data, error } = await auth.supabase
    .from("profiles")
    .select("ai_processing_consent_at")
    .eq("id", auth.userId)
    .single();
  if (error) throw error;
  return Boolean(data.ai_processing_consent_at);
}
