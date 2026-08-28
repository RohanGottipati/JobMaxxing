import { z } from "zod";

import { routeError } from "@/lib/http/api";
import { restoreStructuredResume } from "@/lib/resumes/repository";

export async function POST(request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
  try {
    const { kind, id } = await context.params;
    const parsedKind = z.enum(["master", "tailored"]).parse(kind);
    z.uuid().parse(id);
    const input = z.object({ expectedVersion: z.number().int().nonnegative(), historyId: z.uuid() }).parse(await request.json());
    const rowVersion = await restoreStructuredResume({ kind: parsedKind, id, ...input });
    return Response.json({ rowVersion });
  } catch (error) {
    return routeError(error);
  }
}

