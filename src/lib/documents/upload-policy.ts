export const MAX_DOCUMENT_FILE_SIZE = 10 * 1024 * 1024;

export const DOCUMENT_FILE_ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const PDF_MIME_TYPE = "application/pdf";
const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function documentContentType(file: Pick<File, "name" | "type">) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") && (!file.type || file.type === PDF_MIME_TYPE)) {
    return PDF_MIME_TYPE;
  }
  if (name.endsWith(".docx") && (!file.type || file.type === DOCX_MIME_TYPE)) {
    return DOCX_MIME_TYPE;
  }
  return null;
}

export function validateDocumentFile(file: Pick<File, "name" | "size" | "type">) {
  if (!documentContentType(file)) return "Choose a PDF or DOCX file.";
  if (file.size <= 0) return "The selected file is empty.";
  if (file.size > MAX_DOCUMENT_FILE_SIZE) return "Files must be 10 MB or smaller.";
  return null;
}

export function safeDocumentFileName(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/-+\./g, ".")
    .replace(/^[.-]+|[.-]+$/g, "");
  return normalized.slice(-120) || "document";
}

export function isOwnedApplicationPackagePath(path: string, userId: string) {
  const prefix = `${userId}/application-packages/`;
  const fileName = path.slice(prefix.length);
  return (
    path.startsWith(prefix) &&
    Boolean(fileName) &&
    !fileName.includes("/") &&
    !fileName.includes("..")
  );
}
