import { bulletSuggestionDecisionSchema, decideBulletSuggestion } from "@/lib/resume-analysis/bullets";
import { routeError } from "@/lib/http/api";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const [{ id }, input] = await Promise.all([params, request.json()]);
    return Response.json(await decideBulletSuggestion(id, bulletSuggestionDecisionSchema.parse(input)));
  } catch (error) {
    return routeError(error);
  }
}
