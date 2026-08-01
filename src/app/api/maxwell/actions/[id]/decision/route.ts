import { z } from "zod";

import { decideMaxwellAction } from "@/lib/maxwell/tools";

const schema = z.object({ decision: z.enum(["confirm", "decline"]) });

export async function POST(
  request: Request,
  context: RouteContext<"/api/maxwell/actions/[id]/decision">,
) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid decision." }, { status: 400 });
    const { id } = await context.params;
    return Response.json({ action: await decideMaxwellAction(id, parsed.data.decision) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not complete action." },
      { status: 400 },
    );
  }
}
