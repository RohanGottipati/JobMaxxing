import { z } from "zod";

import { routeError } from "@/lib/http/api";
import { runResumeAnalysis } from "@/lib/resume-analysis/repository";

export const runtime = "nodejs";

const requestSchema = z.object({ kind: z.enum(["master", "tailored"]), resumeId: z.uuid() });

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    return Response.json(await runResumeAnalysis(input.kind, input.resumeId), { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
