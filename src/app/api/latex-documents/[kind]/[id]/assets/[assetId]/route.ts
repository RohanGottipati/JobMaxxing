import { z } from "zod";

import { apiError, routeError } from "@/lib/http/api";
import { parseIfMatch } from "@/lib/latex/http";
import { LATEX_DOCUMENT_KINDS } from "@/lib/latex/constants";
import { downloadLatexAsset, removeLatexAsset } from "@/lib/latex/repository";

const kindSchema = z.enum(LATEX_DOCUMENT_KINDS);

type Context = { params: Promise<{ kind: string; id: string; assetId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { kind, id, assetId } = await context.params;
    const parsedKind = kindSchema.parse(kind);
    z.uuid().parse(id);
    z.uuid().parse(assetId);

    const asset = await downloadLatexAsset({ kind: parsedKind, id, assetId });
    if (!asset) return apiError("NOT_FOUND", "This asset is no longer available.", 404);

    return new Response(asset.body, {
      headers: {
        "Content-Type": asset.contentType,
        "Content-Length": String(asset.body.byteLength),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(asset.fileName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { kind, id, assetId } = await context.params;
    const parsedKind = kindSchema.parse(kind);
    z.uuid().parse(id);
    z.uuid().parse(assetId);

    const expectedVersion = parseIfMatch(request);
    if (expectedVersion === null) {
      return apiError("VALIDATION", "If-Match must contain the current row version.", 400);
    }

    const result = await removeLatexAsset({
      kind: parsedKind,
      id,
      assetId,
      expectedVersion,
    });
    return Response.json(result, { headers: { ETag: `"${result.rowVersion}"` } });
  } catch (error) {
    return routeError(error);
  }
}
