import "server-only";

import { serializeCareerProfile } from "@/lib/career/repository";
import type { CareerProfileV1 } from "@/lib/career/schemas";
import { RESUME_IMPORT_BUCKET } from "@/lib/resume-imports/constants";
import { applyDuplicateDecisions } from "@/lib/resume-imports/duplicates";
import { resumeImportResultSchema, type DuplicateDecisions } from "@/lib/resume-imports/schemas";
import { createEmptyResumeDocument, type ResumeDocumentV1, type ResumeTemplateId } from "@/lib/resumes/schema";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

type ResumeImport = Database["public"]["Tables"]["resume_imports"]["Row"];

export async function importContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Authentication is required.");
  return { supabase, userId: user.id };
}

export async function createUploadImport(input: { fileName: string; mimeType: string; sizeBytes: number }) {
  const { supabase, userId } = await importContext();
  const id = crypto.randomUUID();
  const safeName = input.fileName.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-120) || "resume";
  const path = `${userId}/imports/${id}/${crypto.randomUUID()}-${safeName}`;
  const { error: insertError } = await supabase.from("resume_imports").insert({ id, user_id: userId, source_kind: "upload", status: "uploaded", file_path: path, file_name: safeName, mime_type: input.mimeType, size_bytes: input.sizeBytes });
  if (insertError) throw insertError;
  const { data, error } = await supabase.storage.from(RESUME_IMPORT_BUCKET).createSignedUploadUrl(path);
  if (error) {
    await supabase.from("resume_imports").delete().eq("id", id).eq("user_id", userId);
    throw error;
  }
  return { importId: id, path, token: data.token };
}

export async function createPasteImport(text: string) {
  const { supabase, userId } = await importContext();
  const { data, error } = await supabase.from("resume_imports").insert({ user_id: userId, source_kind: "paste", status: "uploaded", source_text: text, size_bytes: Buffer.byteLength(text, "utf8") }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function getResumeImport(id: string): Promise<ResumeImport | null> {
  const { supabase, userId } = await importContext();
  const { data, error } = await supabase.from("resume_imports").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateResumeImport(id: string, input: Database["public"]["Tables"]["resume_imports"]["Update"]) {
  const { supabase, userId } = await importContext();
  const { data, error } = await supabase.from("resume_imports").update(input).eq("id", id).eq("user_id", userId).select("*").single();
  if (error) throw error;
  return data;
}

export async function claimResumeImport(id: string, useAi: boolean) {
  const { supabase } = await importContext();
  const { data, error } = await supabase.rpc("claim_resume_import", {
    p_import_id: id,
    p_use_ai: useAi,
  });
  if (error) throw error;
  return data;
}

export async function downloadImportSource(row: ResumeImport): Promise<
  | { text: string; pages: Array<{ page: number; text: string }> }
  | { buffer: Buffer; mimeType: string }
> {
  if (row.source_kind === "paste") return { text: row.source_text ?? "", pages: [{ page: 1, text: row.source_text ?? "" }] };
  if (!row.file_path) throw new Error("IMPORT_FILE_MISSING");
  const { supabase } = await importContext();
  const { data, error } = await supabase.storage.from(RESUME_IMPORT_BUCKET).download(row.file_path);
  if (error) throw error;
  return { buffer: Buffer.from(await data.arrayBuffer()), mimeType: row.mime_type ?? "" };
}

export async function getImportReviewData(id: string) {
  const row = await getResumeImport(id);
  if (!row) return null;
  const { supabase } = await importContext();
  let signedUrl: string | null = null;
  if (row.file_path && row.mime_type === "application/pdf") {
    const result = await supabase.storage.from(RESUME_IMPORT_BUCKET).createSignedUrl(row.file_path, 300);
    signedUrl = result.data?.signedUrl ?? null;
  }
  return { row, signedUrl };
}

export async function commitResumeImport(input: { importId: string; profile: CareerProfileV1; duplicateDecisions: DuplicateDecisions; name: string; templateId: ResumeTemplateId; onboarding?: boolean }) {
  const { supabase } = await importContext();
  const row = await getResumeImport(input.importId);
  if (!row?.parsed_payload) throw new Error("The resume import is not ready for review.");
  const parsed = resumeImportResultSchema.parse(row.parsed_payload);
  const resolvedProfile = applyDuplicateDecisions(input.profile, parsed.duplicates, input.duplicateDecisions);
  const document = buildResumeDocument(resolvedProfile, input.templateId);
  const { data, error } = await supabase.rpc("commit_resume_import", {
    p_import_id: input.importId,
    p_profile_payload: serializeCareerProfile(resolvedProfile),
    p_expected_profile_revision: resolvedProfile.revision,
    p_resume_name: input.name,
    p_template_id: input.templateId,
    p_resume_document: document as unknown as Json,
    p_onboarding: input.onboarding ?? false,
  });
  if (error) throw error;
  return data as { resume_id: string; profile_revision: number };
}

export function buildResumeDocument(profile: CareerProfileV1, templateId: ResumeTemplateId): ResumeDocumentV1 {
  const document = createEmptyResumeDocument(templateId);
  for (const section of document.sections) {
    if (section.type === "experience") section.entries = profile.experiences.filter((item) => item.kind === "work").map((item) => ({ id: crypto.randomUUID(), profileItemId: item.id, visible: true, bulletIds: item.bullets.map((bullet) => bullet.id), hiddenBulletIds: [], textOverrides: {} }));
    if (section.type === "education") section.entries = profile.education.map((item) => ({ id: crypto.randomUUID(), profileItemId: item.id, visible: true, bulletIds: [], hiddenBulletIds: [], textOverrides: {} }));
    if (section.type === "projects") section.entries = profile.projects.map((item) => ({ id: crypto.randomUUID(), profileItemId: item.id, visible: true, bulletIds: item.bullets.map((bullet) => bullet.id), hiddenBulletIds: [], textOverrides: {} }));
    if (section.type === "skills") section.entries = profile.skills.map((item) => ({ id: crypto.randomUUID(), profileItemId: item.id, visible: true, bulletIds: [], hiddenBulletIds: [], textOverrides: {} }));
  }
  return document;
}
