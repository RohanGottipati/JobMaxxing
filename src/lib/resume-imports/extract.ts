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

export async function extractResumeText(buffer: Buffer, mimeType: string) {
  validateResumeFile(buffer, mimeType);
  if (mimeType === "application/pdf") {
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

