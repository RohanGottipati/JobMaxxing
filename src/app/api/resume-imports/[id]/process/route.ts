import { z } from "zod";

import { routeError } from "@/lib/http/api";
import { processResumeImport } from "@/lib/resume-imports/process";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    z.uuid().parse(id);
    const input = z.object({ useAi: z.boolean().default(false) }).parse(await request.json());
    const row = await processResumeImport(id, input.useAi);
    return Response.json({ import: row });
  } catch (error) {
    return routeError(error);
  }
}
