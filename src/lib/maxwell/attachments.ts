import "server-only";

export const MAXWELL_MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAXWELL_MAX_EXTRACTED_TEXT = 100_000;
export const MAXWELL_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type MaxwellAttachmentMimeType =
  (typeof MAXWELL_ALLOWED_MIME_TYPES)[number];

export function isMaxwellAttachmentMimeType(
  value: string,
): value is MaxwellAttachmentMimeType {
  return MAXWELL_ALLOWED_MIME_TYPES.some((type) => type === value);
}

function validateMagicBytes(buffer: Buffer, mimeType: MaxwellAttachmentMimeType) {
  if (mimeType === "application/pdf") {
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new Error("The uploaded file is not a valid PDF.");
    }
    return;
  }

  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error("The uploaded file is not a valid DOCX document.");
  }
}

export async function extractAttachmentText(
  buffer: Buffer,
  mimeType: MaxwellAttachmentMimeType,
) {
  validateMagicBytes(buffer, mimeType);

  let text: string;
  if (mimeType === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      text = result.text;
    } finally {
      await parser.destroy();
    }
  } else {
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  }

  const normalized = text.replace(/\u0000/g, "").trim();
  if (!normalized) {
    throw new Error("No readable text could be extracted from this document.");
  }

  return normalized.slice(0, MAXWELL_MAX_EXTRACTED_TEXT);
}
