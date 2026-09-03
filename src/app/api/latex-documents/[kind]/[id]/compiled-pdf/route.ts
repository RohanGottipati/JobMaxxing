import { z } from "zod";

import { apiError, routeError } from "@/lib/http/api";
import { LATEX_DOCUMENT_KINDS, MAX_COMPILED_PDF_SIZE } from "@/lib/latex/constants";
import { registerCompiledPdf } from "@/lib/latex/repository";

const kindSchema = z.enum(LATEX_DOCUMENT_KINDS);

/**
 * The browser uploads the PDF it just produced along with the source revision
 * it compiled. If the source has moved on, the RPC rejects the write and the
 * Studio keeps the PDF locally while reporting a conflict.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  try {
    const { kind, id } = await context.params;
    const parsedKind = kindSchema.parse(kind);
    z.uuid().parse(id);

    const header = request.headers.get("x-source-version");
    if (!header || !/^\d+$/.test(header)) {
      return apiError("VALIDATION", "X-Source-Version must contain the compiled row version.", 400);
    }

    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_COMPILED_PDF_SIZE) {
      return apiError("VALIDATION", "Compiled PDFs must be 20 MB or smaller.", 413);
    }

    const result = await registerCompiledPdf({
      kind: parsedKind,
      id,
      sourceVersion: Number(header),
      bytes: new Uint8Array(body),
    });

    return Response.json(result, { headers: { ETag: `"${result.rowVersion}"` } });
  } catch (error) {
    return routeError(error);
  }
}
