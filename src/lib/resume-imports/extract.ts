import "server-only";

import { RESUME_IMPORT_MAX_TEXT, RESUME_IMPORT_MIME_TYPES } from "@/lib/resume-imports/schemas";

export type ResumeMimeType = (typeof RESUME_IMPORT_MIME_TYPES)[number];

export function validateResumeFile(buffer: Buffer, mimeType: string): asserts mimeType is ResumeMimeType {
  if (mimeType === "application/pdf") {
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("INVALID_PDF");
    return;
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b;
    const hasDocumentPart = buffer.includes(Buffer.from("word/document.xml"));
    if (!isZip || !hasDocumentPart) throw new Error("INVALID_DOCX");
    return;
  }
  throw new Error("UNSUPPORTED_FILE_TYPE");
}

/**
 * pdf-parse loads pdfjs-dist, which references browser globals (DOMMatrix,
 * Path2D, ImageData, DOMPoint) at module-eval time. In the standalone server
 * build those globals are absent — pdf-parse ships @napi-rs/canvas to supply
 * them, but the tracer drops that native dependency, so pdfjs throws
 * `ReferenceError: DOMMatrix is not defined` when the module loads. Importing
 * @napi-rs/canvas here (a) keeps it in the traced output and (b) guarantees the
 * globals exist before pdf-parse is imported, regardless of load order.
 */
async function ensurePdfRuntimeGlobals() {
  const globals = globalThis as Record<string, unknown>;
  if (globals.DOMMatrix) return;
  const canvas = await import("@napi-rs/canvas");
  globals.DOMMatrix ??= canvas.DOMMatrix;
  globals.ImageData ??= canvas.ImageData;
  globals.Path2D ??= canvas.Path2D;
  globals.DOMPoint ??= canvas.DOMPoint;
}

export async function extractResumeText(buffer: Buffer, mimeType: string) {
  validateResumeFile(buffer, mimeType);
  if (mimeType === "application/pdf") {
    await ensurePdfRuntimeGlobals();
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      const pages = result.pages.map((item) => ({ page: item.num, text: item.text.replace(/\u0000/g, "").trim() }));
      const text = result.text.replace(/\u0000/g, "").trim().slice(0, RESUME_IMPORT_MAX_TEXT);
      if (!text) throw new Error("NO_READABLE_TEXT");
      return { text, pages };
    } finally {
      await parser.destroy();
    }
  }
  const mammoth = (await import("mammoth")).default;
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value.replace(/\u0000/g, "").trim().slice(0, RESUME_IMPORT_MAX_TEXT);
  if (!text) throw new Error("NO_READABLE_TEXT");
  return { text, pages: [{ page: 1, text }] };
}

