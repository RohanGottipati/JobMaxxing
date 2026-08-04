import "server-only";

import { createResumeRenderModel } from "@/lib/resumes/render-model";
import { generateResumeDocx } from "@/lib/resumes/docx";
import { generateResumePdf } from "@/lib/resumes/pdf";
import { getStructuredResumeForExport, type StructuredResumeKind } from "@/lib/resumes/repository";
import { createClient } from "@/lib/supabase/server";

export type ResumeExportFormat = "pdf" | "docx";

const EXPORT_LIMIT_PER_HOUR = 20;
const EXPORT_TIMEOUT_MS = 30_000;

export async function generateResumeExport(input: {
  kind: StructuredResumeKind;
  id: string;
  expectedVersion: number;
  format: ResumeExportFormat;
}) {
  const startedAt = Date.now();
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Authentication is required.");

  const windowStart = new Date(Date.now() - 60 * 60 * 1_000).toISOString();
  const { count, error: countError } = await supabase
    .from("document_exports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", windowStart);
  if (countError) throw countError;
  if ((count ?? 0) >= EXPORT_LIMIT_PER_HOUR) throw new Error("RATE_LIMITED: Export limit reached.");

  const resume = await getStructuredResumeForExport(input.kind, input.id);
  if (resume.rowVersion !== input.expectedVersion) {
    throw new Error("The resume changed in another session.");
  }

  const fileName = `${safeFileName(resume.title || "resume")}.${input.format}`;
  const parent = input.kind === "master"
    ? { resume_id: input.id, resume_version_id: null }
    : { resume_id: null, resume_version_id: input.id };
  const { data: audit, error: auditError } = await supabase
    .from("document_exports")
    .insert({
      user_id: user.id,
      ...parent,
      format: input.format,
      status: "processing",
      row_version: resume.rowVersion,
      file_name: fileName,
    })
    .select("id")
    .single();
  if (auditError) throw auditError;

  try {
    const model = createResumeRenderModel(resume.document, resume.profile);
    const generation = input.format === "pdf" ? generateResumePdf(model) : generateResumeDocx(model);
    const buffer = await withTimeout(generation, EXPORT_TIMEOUT_MS);
    const durationMs = Date.now() - startedAt;
    const { error: updateError } = await supabase
      .from("document_exports")
      .update({ status: "succeeded", size_bytes: buffer.byteLength, duration_ms: durationMs, completed_at: new Date().toISOString() })
      .eq("id", audit.id)
      .eq("user_id", user.id);
    if (updateError) {
      console.error("Resume export audit completion failed", { exportId: audit.id, code: updateError.code });
    }
    return {
      buffer,
      fileName,
      exportId: audit.id,
      contentType: input.format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  } catch (error) {
    const errorCode = error instanceof Error && error.message === "EXPORT_TIMEOUT" ? "TIMEOUT" : "GENERATION_FAILED";
    await supabase
      .from("document_exports")
      .update({ status: "failed", duration_ms: Date.now() - startedAt, error_code: errorCode, completed_at: new Date().toISOString() })
      .eq("id", audit.id)
      .eq("user_id", user.id);
    console.error("Resume export failed", { exportId: audit.id, format: input.format, code: errorCode });
    throw error;
  }
}

function safeFileName(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 100);
  return normalized || "resume";
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("EXPORT_TIMEOUT")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
