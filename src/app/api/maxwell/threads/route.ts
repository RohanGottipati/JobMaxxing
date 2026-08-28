import { z } from "zod";

import {
  createMaxwellThread,
  listMaxwellThreads,
} from "@/lib/maxwell/repository";

const createSchema = z.object({ title: z.string().max(160).optional() });

export async function GET() {
  try {
    return Response.json({ threads: await listMaxwellThreads() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not load conversations." },
      { status: 401 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
    return Response.json(
      { thread: await createMaxwellThread(parsed.data.title) },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not create conversation." },
      { status: 400 },
    );
  }
}
