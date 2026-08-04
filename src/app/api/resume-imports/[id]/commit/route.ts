import { z } from "zod";

import { routeError } from "@/lib/http/api";
import { careerProfileV1Schema } from "@/lib/career/schemas";
import { duplicateDecisionsSchema } from "@/lib/resume-imports/schemas";
import { RESUME_TEMPLATE_IDS } from "@/lib/resumes/schema";
import { commitResumeImport } from "@/lib/resume-imports/repository";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    z.uuid().parse(id);
    const input = z.object({
      profile: careerProfileV1Schema,
      duplicateDecisions: duplicateDecisionsSchema,
      name: z.string().trim().min(1).max(160),
      templateId: z.enum(RESUME_TEMPLATE_IDS),
      onboarding: z.boolean().default(false),
    }).parse(await request.json());
    const result = await commitResumeImport({ importId: id, ...input });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
