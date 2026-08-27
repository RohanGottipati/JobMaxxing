import { z } from "zod";

import { routeError } from "@/lib/http/api";
import { resumeDocumentV1Schema } from "@/lib/resumes/schema";
import { checkpointStructuredResume } from "@/lib/resumes/repository";

export async function POST(request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
  try {
    const { kind, id } = await context.params;
    const parsedKind = z.enum(["master", "tailored"]).parse(kind);
    z.uuid().parse(id);
    const input = z.object({ expectedVersion: z.number().int().nonnegative(), document: resumeDocumentV1Schema, reason: z.string().trim().min(1).max(80) }).parse(await request.json());
    const historyId = await checkpointStructuredResume({ kind: parsedKind, id, ...input });
    return Response.json({ historyId }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}

