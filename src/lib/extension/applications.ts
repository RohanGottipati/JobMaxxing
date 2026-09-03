import "server-only";

import { z } from "zod";

import { hashJobDescription } from "@/lib/applications/description-hash";
import type {
  Application,
  ApplicationStatus,
  ApplicationUpdate,
} from "@/lib/applications/package-types";
import { analyzeApplicationJob } from "@/lib/job-intelligence/repository";
import type { AuthContext } from "@/lib/supabase/request-client";

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
  sourceHost: z.string().trim().max(200).optional().nullable(),
  recruitingSeason: z.string().trim().max(100).optional().nullable(),
});

export type ExtensionApplicationInput = z.infer<typeof extensionApplicationSchema>;

export const extensionApplicationUpdateSchema = extensionApplicationSchema
  .partial()
  .extend({ id: z.uuid() });

export type ExtensionApplicationUpdate = z.infer<typeof extensionApplicationUpdateSchema>;

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

export async function deleteExtensionApplication(auth: AuthContext, id: string) {
  const { error } = await auth.supabase
    .from("applications")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);
  if (error) throw error;
}

export async function deleteAllExtensionApplications(auth: AuthContext) {
  const { error } = await auth.supabase
    .from("applications")
    .delete()
    .eq("user_id", auth.userId);
  if (error) throw error;
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
