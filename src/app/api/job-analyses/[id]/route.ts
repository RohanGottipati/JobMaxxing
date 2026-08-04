import { confirmJobAnalysis, jobAnalysisReviewSchema } from "@/lib/job-intelligence/repository";
import { routeError } from "@/lib/http/api";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const [{ id }, input] = await Promise.all([params, request.json()]);
    return Response.json(await confirmJobAnalysis(id, jobAnalysisReviewSchema.parse(input)));
  } catch (error) {
    return routeError(error);
  }
}
