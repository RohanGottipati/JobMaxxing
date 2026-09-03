import { z } from "zod";

import { routeError } from "@/lib/http/api";
import { LATEX_DOCUMENT_KINDS } from "@/lib/latex/constants";
import { checkpointLatexSource } from "@/lib/latex/repository";

const kindSchema = z.enum(LATEX_DOCUMENT_KINDS);

const bodySchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  reason: z.string().trim().min(1).max(80),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  try {
    const { kind, id } = await context.params;
    const parsedKind = kindSchema.parse(kind);
    z.uuid().parse(id);

    const input = bodySchema.parse(await request.json());
    const historyId = await checkpointLatexSource({ kind: parsedKind, id, ...input });

    return Response.json({ historyId }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
