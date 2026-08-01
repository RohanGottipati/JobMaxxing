import { z } from "zod";

import {
  deleteMaxwellThread,
  getMaxwellThread,
  renameMaxwellThread,
} from "@/lib/maxwell/repository";

const updateSchema = z.object({ title: z.string().trim().min(1).max(160) });

export async function GET(_request: Request, context: RouteContext<"/api/maxwell/threads/[id]">) {
  try {
    const { id } = await context.params;
    const thread = await getMaxwellThread(id);
    if (!thread) return Response.json({ error: "Conversation not found." }, { status: 404 });
    return Response.json(thread);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not load conversation." },
      { status: 400 },
    );
  }
}
export async function PATCH(request: Request, context: RouteContext<"/api/maxwell/threads/[id]">) {
  try {
    const { id } = await context.params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid title." }, { status: 400 });
    return Response.json({ thread: await renameMaxwellThread(id, parsed.data.title) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not rename conversation." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext<"/api/maxwell/threads/[id]">) {
  try {
    const { id } = await context.params;
    await deleteMaxwellThread(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not delete conversation." },
      { status: 400 },
    );
  }
}
