import { z } from "zod";

import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import {
  getMaxwellAuthContext,
  registerMaxwellAttachment,
} from "@/lib/maxwell/repository";

export const runtime = "nodejs";

const schema = z.object({
  threadId: z.string().uuid(),
  filePath: z.string().min(1).max(1_000),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.number().int().positive(),
});

export async function POST(request: Request) {
  let cleanupPath: string | null = null;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid attachment." }, { status: 400 });
    cleanupPath = parsed.data.filePath;
    const attachment = await registerMaxwellAttachment(parsed.data);
    cleanupPath = null;
    return Response.json({ attachment }, { status: 201 });
  } catch (error) {
    if (cleanupPath) {
      const { supabase, userId } = await getMaxwellAuthContext();
      if (cleanupPath.startsWith(`${userId}/assistant/`)) {
        await supabase.storage.from(DOCUMENT_BUCKET).remove([cleanupPath]);
      }
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not read attachment." },
      { status: 400 },
    );
  }
}
