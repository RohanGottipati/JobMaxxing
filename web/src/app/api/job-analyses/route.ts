import { z } from "zod";

import { analyzeApplicationJob } from "@/lib/job-intelligence/repository";
import { routeError } from "@/lib/http/api";

export const runtime = "nodejs";

const requestSchema = z.object({
  applicationId: z.uuid(),
  sourceText: z.string().trim().min(80).max(200_000).optional(),
});

export async function POST(request: Request) {
  try {
    const { applicationId, sourceText } = requestSchema.parse(await request.json());
    return Response.json(await analyzeApplicationJob(applicationId, sourceText), { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
