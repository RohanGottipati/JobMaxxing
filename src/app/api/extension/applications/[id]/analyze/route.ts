import { z } from "zod";

import { analyzeExtensionApplication } from "@/lib/extension/applications";
import { routeError } from "@/lib/http/api";
import {
  getAuthContextFromRequest,
  requireBearerAuth,
} from "@/lib/supabase/request-client";

export const runtime = "nodejs";

const requestSchema = z.object({
  sourceText: z.string().trim().min(80).max(200_000).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireBearerAuth(request);
    const auth = await getAuthContextFromRequest(request);
    const { id } = await context.params;
    const { sourceText } = requestSchema.parse(
      await request.json().catch(() => ({})),
    );
    const analysis = await analyzeExtensionApplication(auth, id, sourceText);
    return Response.json({ ok: true, analysis, sourceText: sourceText ?? null }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
