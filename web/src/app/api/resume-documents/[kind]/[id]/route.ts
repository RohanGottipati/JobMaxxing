import { z } from "zod";

import { apiError, routeError } from "@/lib/http/api";
import { resumeDocumentV1Schema } from "@/lib/resumes/schema";
import { saveStructuredResume } from "@/lib/resumes/repository";

const kindSchema = z.enum(["master", "tailored"]);

export async function PATCH(request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
  try {
    const { kind, id } = await context.params;
    const parsedKind = kindSchema.parse(kind);
    z.uuid().parse(id);
    const header = request.headers.get("if-match")?.replace(/^W\/|\"/g, "").replace(/\"$/, "");
    if (!header || !/^\d+$/.test(header)) return apiError("VALIDATION", "If-Match must contain the current row version.", 400);
    const input = z.object({ title: z.string().trim().min(1).max(160), document: resumeDocumentV1Schema }).parse(await request.json());
    const rowVersion = await saveStructuredResume({ kind: parsedKind, id, expectedVersion: Number(header), ...input });
    return Response.json({ rowVersion, savedAt: new Date().toISOString() }, { headers: { ETag: `"${rowVersion}"` } });
  } catch (error) {
    return routeError(error);
  }
}

