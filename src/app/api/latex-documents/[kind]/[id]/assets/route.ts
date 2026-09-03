import { z } from "zod";

import { apiError, routeError } from "@/lib/http/api";
import { parseIfMatch } from "@/lib/latex/http";
import { LATEX_DOCUMENT_KINDS, MAX_LATEX_ASSET_SIZE } from "@/lib/latex/constants";
import { attachLatexAsset } from "@/lib/latex/repository";

const kindSchema = z.enum(LATEX_DOCUMENT_KINDS);

export async function POST(
  request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  try {
    const { kind, id } = await context.params;
    const parsedKind = kindSchema.parse(kind);
    z.uuid().parse(id);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return apiError("VALIDATION", "Attach a file to upload.", 400);
    }
    if (file.size > MAX_LATEX_ASSET_SIZE) {
      return apiError("VALIDATION", "Each asset must be 5 MB or smaller.", 413);
    }

    const expectedVersion = parseIfMatch(request);
    if (expectedVersion === null) {
      return apiError("VALIDATION", "If-Match must contain the current row version.", 400);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await attachLatexAsset({
      kind: parsedKind,
      id,
      fileName: file.name,
      bytes,
      expectedVersion,
    });

    return Response.json(result, { status: 201, headers: { ETag: `"${result.rowVersion}"` } });
  } catch (error) {
    return routeError(error);
  }
}
