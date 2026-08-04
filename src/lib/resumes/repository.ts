import "server-only";

import { getCanonicalCareerProfile } from "@/lib/career/repository";
import { buildResumeDocument } from "@/lib/resume-imports/repository";
import { resumeDocumentV1Schema, type ResumeDocumentV1, type ResumeTemplateId } from "@/lib/resumes/schema";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

export type StructuredResumeKind = "master" | "tailored";
type Resume = Database["public"]["Tables"]["resumes"]["Row"];
type ResumeVersion = Database["public"]["Tables"]["resume_versions"]["Row"];

async function context() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Authentication is required.");
  return { supabase, userId: user.id };
}

export async function createStructuredMasterResume(input: { name: string; templateId: ResumeTemplateId }) {
  const { supabase, userId } = await context();
  const profile = await getCanonicalCareerProfile();
  const document = buildResumeDocument(profile, input.templateId);
  const { count, error: countError } = await supabase.from("resumes").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (countError) throw countError;
  const { data, error } = await supabase.from("resumes").insert({
    user_id: userId,
    name: input.name,
    is_default: (count ?? 0) === 0,
    editor_mode: "structured",
    document_schema_version: 1,
    structured_content: document as unknown as Json,
    template_id: input.templateId,
    row_version: 0,
  }).select("*").single();
  if (error) throw error;
  return data;
}

export async function getStructuredResume(kind: StructuredResumeKind, id: string) {
  const { supabase, userId } = await context();
  const query = kind === "master"
    ? supabase.from("resumes").select("*").eq("id", id).eq("user_id", userId).maybeSingle()
    : supabase.from("resume_versions").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  const [{ data: row, error }, profile, history] = await Promise.all([
    query,
    getCanonicalCareerProfile(),
    kind === "master"
      ? supabase.from("resume_document_history").select("id, row_version, title, template_id, structured_content, reason, created_at").eq("user_id", userId).eq("resume_id", id).order("created_at", { ascending: false }).limit(50)
      : supabase.from("resume_document_history").select("id, row_version, title, template_id, structured_content, reason, created_at").eq("user_id", userId).eq("resume_version_id", id).order("created_at", { ascending: false }).limit(50),
  ]);
  if (error) throw error;
  if (history.error) throw history.error;
  if (!row || row.editor_mode !== "structured" || !row.structured_content) return null;
  const document = resumeDocumentV1Schema.parse(row.structured_content);
  return {
    kind,
    id: row.id,
    title: kind === "master" ? (row as Resume).name : ((row as ResumeVersion).title ?? "Tailored resume"),
    rowVersion: row.row_version,
    submitted: kind === "tailored" && Boolean((row as ResumeVersion).submitted_at),
    applicationId: kind === "tailored" ? (row as ResumeVersion).application_id : null,
    document,
    profile,
    history: (history.data ?? []).map((item) => ({ ...item, structured_content: resumeDocumentV1Schema.parse(item.structured_content) })),
  };
}

export async function saveStructuredResume(input: { kind: StructuredResumeKind; id: string; expectedVersion: number; title: string; document: ResumeDocumentV1 }) {
  const parsed = resumeDocumentV1Schema.parse(input.document);
  const { supabase } = await context();
  const { data, error } = await supabase.rpc("save_structured_resume_document", {
    p_kind: input.kind,
    p_document_id: input.id,
    p_expected_version: input.expectedVersion,
    p_title: input.title,
    p_template_id: parsed.presentation.templateId,
    p_document: parsed as unknown as Json,
  });
  if (error) throw error;
  return data;
}

export async function checkpointStructuredResume(input: { kind: StructuredResumeKind; id: string; expectedVersion: number; document: ResumeDocumentV1; reason: string }) {
  const parsed = resumeDocumentV1Schema.parse(input.document);
  const { supabase } = await context();
  const { data, error } = await supabase.rpc("checkpoint_structured_resume_document", {
    p_kind: input.kind,
    p_document_id: input.id,
    p_expected_version: input.expectedVersion,
    p_resolved_snapshot: { schemaVersion: 1, document: parsed } as unknown as Json,
    p_reason: input.reason,
  });
  if (error) throw error;
  return data;
}

export async function restoreStructuredResume(input: { kind: StructuredResumeKind; id: string; expectedVersion: number; historyId: string }) {
  const { supabase, userId } = await context();
  const { data: history, error } = await supabase.from("resume_document_history").select("title, structured_content").eq("id", input.historyId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!history) throw new Error("Resume history not found.");
  const document = resumeDocumentV1Schema.parse(history.structured_content);
  return saveStructuredResume({ kind: input.kind, id: input.id, expectedVersion: input.expectedVersion, title: history.title, document });
}

export async function getStructuredResumeForExport(kind: StructuredResumeKind, id: string) {
  const result = await getStructuredResume(kind, id);
  if (!result) throw new Error("Structured resume not found.");
  return result;
}
