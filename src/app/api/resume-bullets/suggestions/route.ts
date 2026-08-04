import { createBulletSuggestion, bulletSuggestionRequestSchema } from "@/lib/resume-analysis/bullets";
import { routeError } from "@/lib/http/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = bulletSuggestionRequestSchema.parse(await request.json());
    return Response.json(await createBulletSuggestion(input), { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
