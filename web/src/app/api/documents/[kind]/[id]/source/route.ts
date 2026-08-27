import {
  getCoverLetter,
  getMasterResume,
  getTailoredResume,
} from "@/lib/documents/repository";
import type { DocumentContentFormat } from "@/types/database";

const formats: Record<DocumentContentFormat, { extension: string; mime: string }> = {
  plain_text: { extension: "txt", mime: "text/plain; charset=utf-8" },
  markdown: { extension: "md", mime: "text/markdown; charset=utf-8" },
  latex: { extension: "tex", mime: "application/x-tex; charset=utf-8" },
};

function fileName(title: string, extension: string) {
  const safe = title
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "document";
  return `${safe}.${extension}`;
}
export async function GET(
  _request: Request,
  context: RouteContext<"/api/documents/[kind]/[id]/source">,
) {
  const { kind, id } = await context.params;
  const document =
    kind === "master_resume"
      ? await getMasterResume(id)
      : kind === "resume_version"
        ? await getTailoredResume(id)
        : kind === "cover_letter"
          ? await getCoverLetter(id)
          : null;
  if (!document || !document.content) {
    return Response.json({ error: "Document source not found." }, { status: 404 });
  }
  const title = "name" in document ? document.name : document.title || "document";
  const format = formats[document.content_format];
  return new Response(document.content, {
    headers: {
      "Content-Type": format.mime,
      "Content-Disposition": `attachment; filename="${fileName(title, format.extension)}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
