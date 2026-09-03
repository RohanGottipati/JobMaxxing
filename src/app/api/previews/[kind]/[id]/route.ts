import { z } from "zod";

import { apiError, routeError } from "@/lib/http/api";
import { getPreviewDescriptor } from "@/lib/previews/repository";
import { PREVIEW_KINDS } from "@/lib/previews/types";

const kindSchema = z.enum(PREVIEW_KINDS);

export async function GET(
  _request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  try {
    const { kind, id } = await context.params;
    const parsedKind = kindSchema.parse(kind);
    z.uuid().parse(id);

    const descriptor = await getPreviewDescriptor(parsedKind, id);
    if (!descriptor) {
      return apiError("NOT_FOUND", "This document is not available to preview.", 404);
    }

    return Response.json(descriptor, {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
