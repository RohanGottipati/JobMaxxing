import { z } from "zod";

import { routeError } from "@/lib/http/api";
import { updateResumeImport } from "@/lib/resume-imports/repository";
import { resumeImportReviewSchema } from "@/lib/resume-imports/schemas";
import type { Json } from "@/types/database";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    z.uuid().parse(id);
    const input = resumeImportReviewSchema.parse(await request.json());
    const row = await updateResumeImport(id, { review_payload: input as unknown as Json, reviewed_at: new Date().toISOString() });
    return Response.json({ import: row });
  } catch (error) {
    return routeError(error);
  }
}
