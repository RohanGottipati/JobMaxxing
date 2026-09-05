import { z } from "zod";

import { apiError, routeError } from "@/lib/http/api";
import { getPreviewBinary } from "@/lib/previews/repository";
import { PREVIEW_KINDS } from "@/lib/previews/types";

const kindSchema = z.enum(PREVIEW_KINDS);

/**
 * Private objects are streamed through the app rather than exposed as storage
 * URLs, so the browser preview never holds a shareable link to a user's file.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  try {
    const { kind, id } = await context.params;
    const parsedKind = kindSchema.parse(kind);
    z.uuid().parse(id);

    const url = new URL(request.url);
    const asDownload = url.searchParams.get("download") === "1";

    const file = await getPreviewBinary(parsedKind, id);
    if (!file) {
      return apiError("NOT_FOUND", "This file is no longer available.", 404);
    }

    const disposition = asDownload ? "attachment" : "inline";
    const encodedName = encodeURIComponent(file.fileName);

    return new Response(file.body, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(file.body.byteLength),
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
