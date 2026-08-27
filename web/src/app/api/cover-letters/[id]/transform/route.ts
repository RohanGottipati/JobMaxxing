import { transformCoverLetter } from "@/lib/job-intelligence/cover-letters";
import { coverLetterTransformSchema } from "@/lib/job-intelligence/schemas";
import { routeError } from "@/lib/http/api";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const [{ id }, body] = await Promise.all([params, request.json()]);
    return Response.json(
      await transformCoverLetter(id, coverLetterTransformSchema.parse(body)),
      { status: 201 },
    );
  } catch (error) {
    return routeError(error);
  }
}
