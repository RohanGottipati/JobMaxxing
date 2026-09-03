import { z } from "zod";

import { apiError, routeError } from "@/lib/http/api";
import { LATEX_DOCUMENT_KINDS } from "@/lib/latex/constants";
import {
  buildLatexProjectArchive,
  latexProjectFileName,
} from "@/lib/latex/project-archive";
import { readLatexProject } from "@/lib/latex/repository";

const kindSchema = z.enum(LATEX_DOCUMENT_KINDS);

export async function GET(
  _request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  try {
    const { kind, id } = await context.params;
    const parsedKind = kindSchema.parse(kind);
    z.uuid().parse(id);

    const project = await readLatexProject(parsedKind, id);
    if (!project) return apiError("NOT_FOUND", "This document was not found.", 404);

    const archive = await buildLatexProjectArchive(project);
    const fileName = latexProjectFileName(project.title);

    return new Response(archive as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(archive.byteLength),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
