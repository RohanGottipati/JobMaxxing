import { z } from "zod";

import { apiError, routeError } from "@/lib/http/api";
import { RESUME_IMPORT_BUCKET } from "@/lib/resume-imports/constants";
import { getResumeImport, importContext } from "@/lib/resume-imports/repository";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    z.uuid().parse(id);
    const row = await getResumeImport(id);
    if (!row) return apiError("NOT_FOUND", "Resume import not found.", 404);
    return Response.json({ import: row }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    z.uuid().parse(id);
    const row = await getResumeImport(id);
    if (!row) return apiError("NOT_FOUND", "Resume import not found.", 404);
    if (row.status === "committed" && row.committed_resume_id) return apiError("CONFLICT", "Delete the linked resume before deleting its import record.", 409);
    const { supabase, userId } = await importContext();
    const { error } = await supabase.from("resume_imports").delete().eq("id", id).eq("user_id", userId);
    if (error) throw error;
    if (row.file_path) await supabase.storage.from(RESUME_IMPORT_BUCKET).remove([row.file_path]);
    return new Response(null, { status: 204 });
  } catch (error) {
    return routeError(error);
  }
}
