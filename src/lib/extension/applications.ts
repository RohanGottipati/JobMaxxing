import "server-only";

import { z } from "zod";

import { hashJobDescription } from "@/lib/applications/description-hash";
import type { ApplicationStatus } from "@/lib/applications/package-types";
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
  status: extensionStatusSchema.optional(),
  jobDescription: z.string().trim().max(200_000).optional().nullable(),
  notes: z.string().trim().max(10_000).optional().nullable(),
  sourceHost: z.string().trim().max(200).optional().nullable(),
  recruitingSeason: z.string().trim().max(100).optional().nullable(),
});

export type ExtensionApplicationInput = z.infer<typeof extensionApplicationSchema>;

function toSummary(row: {
  id: string;
  company_name: string;
  role_title: string;
  status: ApplicationStatus;
  date_applied: string | null;
  updated_at: string;
}) {
  return {
    id: row.id,
    companyName: row.company_name,
    roleTitle: row.role_title,
    status: row.status,
    dateApplied: row.date_applied,
    updatedAt: row.updated_at,
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

export async function getRecentExtensionApplications(
  auth: AuthContext,
  limit = 10,
) {
  const { data, error } = await auth.supabase
    .from("applications")
    .select("id, company_name, role_title, status, date_applied, updated_at")
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
