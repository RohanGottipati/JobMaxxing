import { z } from "zod";

import { apiError, routeError } from "@/lib/http/api";
import { LATEX_DOCUMENT_KINDS, LATEX_ENGINES, MAX_LATEX_SOURCE_LENGTH } from "@/lib/latex/constants";
import { parseIfMatch } from "@/lib/latex/http";
import { getLatexDocument, saveLatexSource } from "@/lib/latex/repository";

const kindSchema = z.enum(LATEX_DOCUMENT_KINDS);

const bodySchema = z.object({
  title: z.string().trim().min(1).max(160),
  source: z.string().max(MAX_LATEX_SOURCE_LENGTH),
  engine: z.enum(LATEX_ENGINES).nullable().default(null),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  try {
    const { kind, id } = await context.params;
    const parsedKind = kindSchema.parse(kind);
    z.uuid().parse(id);

    const document = await getLatexDocument(parsedKind, id);
    if (!document) return apiError("NOT_FOUND", "This document was not found.", 404);

    return Response.json(document, {
      headers: { ETag: `"${document.rowVersion}"`, "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  try {
    const { kind, id } = await context.params;
    const parsedKind = kindSchema.parse(kind);
    z.uuid().parse(id);

    const expectedVersion = parseIfMatch(request);
    if (expectedVersion === null) {
      return apiError("VALIDATION", "If-Match must contain the current row version.", 400);
    }

    const input = bodySchema.parse(await request.json());
    const rowVersion = await saveLatexSource({
      kind: parsedKind,
      id,
      expectedVersion,
      ...input,
    });

    return Response.json(
      { rowVersion, savedAt: new Date().toISOString() },
      { headers: { ETag: `"${rowVersion}"` } },
    );
  } catch (error) {
    return routeError(error);
  }
}
