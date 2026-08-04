import "server-only";

import { getCanonicalCareerProfile } from "@/lib/career/repository";
import { enhanceImportWithGemini } from "@/lib/resume-imports/ai-parser";
import { extractResumeText } from "@/lib/resume-imports/extract";
import { parseResumeDeterministically } from "@/lib/resume-imports/parser";
import { claimResumeImport, downloadImportSource, getResumeImport, updateResumeImport } from "@/lib/resume-imports/repository";
import type { Json } from "@/types/database";

export async function processResumeImport(id: string, useAi: boolean) {
  const row = await getResumeImport(id);
  if (!row) throw new Error("Resume import not found.");
  if (row.status === "review_required") return row;

  const recovered = await claimResumeImport(id, useAi);
  try {
    const source = await downloadImportSource(row);
    const extracted = "buffer" in source ? await extractResumeText(source.buffer, source.mimeType) : source;
    await updateResumeImport(id, { status: "parsing", source_text: extracted.text, page_metadata: extracted.pages as unknown as Json });
    const existing = await getCanonicalCareerProfile();
    let result = parseResumeDeterministically({ text: extracted.text, pages: extracted.pages, existing });
    if (recovered) result.warnings.push("A stalled processing attempt was recovered and restarted safely.");
    let aiUsed = false;
    if (useAi && existing.email !== undefined) {
      // Consent is read from the profile row in a separate minimal query inside
      // the update path. The canonical DTO intentionally omits the timestamp.
      const { importContext } = await import("@/lib/resume-imports/repository");
      const { supabase, userId } = await importContext();
      const consent = await supabase.from("profiles").select("ai_processing_consent_at").eq("id", userId).single();
      if (consent.data?.ai_processing_consent_at) {
        try {
          result = await enhanceImportWithGemini({ sourceText: extracted.text, deterministic: result });
          aiUsed = true;
        } catch {
          result.warnings.push("AI classification was unavailable, so deterministic parsing was used.");
        }
      } else {
        result.warnings.push("AI classification was not used because consent has not been granted.");
      }
    }
    return await updateResumeImport(id, {
      status: "review_required",
      parsed_payload: result as unknown as Json,
      warnings: result.warnings as unknown as Json,
      page_metadata: extracted.pages as unknown as Json,
      parser_version: "resume-parser-v1",
      ai_used: aiUsed,
      ai_model: aiUsed ? (process.env.GEMINI_MODEL || "gemini-2.5-flash") : null,
      processing_finished_at: new Date().toISOString(),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 80) : "IMPORT_FAILED";
    await updateResumeImport(id, { status: "failed", error_code: code, processing_finished_at: new Date().toISOString() });
    throw error;
  }
}
