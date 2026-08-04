import { jobMatchRequestSchema, runJobMatch } from "@/lib/job-intelligence/repository";
import { routeError } from "@/lib/http/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = jobMatchRequestSchema.parse(await request.json());
    return Response.json(await runJobMatch(input), { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
