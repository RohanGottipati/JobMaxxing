import { z } from "zod";

import { apiError, routeError } from "@/lib/http/api";
import { generateResumeExport } from "@/lib/resumes/exports";

const kindSchema = z.enum(["master", "tailored"]);
const exportSchema = z.object({
  format: z.enum(["pdf", "docx"]),
  expectedVersion: z.number().int().nonnegative(),
});

export async function POST(request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
  try {
    const { kind, id } = await context.params;
    const parsedKind = kindSchema.parse(kind);
    z.uuid().parse(id);
    const input = exportSchema.parse(await request.json());
    const result = await generateResumeExport({ kind: parsedKind, id, ...input });
    return new Response(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Length": String(result.buffer.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Filename": result.fileName,
        "X-Export-Id": result.exportId,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("RATE_LIMITED")) {
      return apiError("RATE_LIMITED", "You have reached the hourly export limit. Try again later.", 429, { retryAfterSeconds: 3600 });
    }
    if (error instanceof Error && error.message === "EXPORT_TIMEOUT") {
      return apiError("UNAVAILABLE", "Export generation timed out. Try again.", 503);
    }
    return routeError(error);
  }
}
