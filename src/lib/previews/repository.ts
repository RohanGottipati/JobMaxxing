import "server-only";

import { getCanonicalCareerProfile } from "@/lib/career/repository";
import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import { selectPreviewViews } from "@/lib/previews/select-view";
import type {
  DocumentPreviewDescriptor,
  PreviewBinaryTarget,
  PreviewDownload,
  PreviewKind,
  PreviewView,
} from "@/lib/previews/types";
import { previewBinaryPath } from "@/lib/previews/types";
import { createResumeRenderModel } from "@/lib/resumes/render-model";
import { resumeDocumentV1Schema } from "@/lib/resumes/schema";
import { createClient } from "@/lib/supabase/server";
import type { DocumentContentFormat } from "@/types/database";

const PDF_MIME_TYPE = "application/pdf";
const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function context() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Authentication is required.");
  return { supabase, userId: user.id };
}

async function readApplicationLabel(applicationId: string) {
  const { supabase, userId } = await context();
  const { data, error } = await supabase
    .from("applications")
    .select("company_name, role_title")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function attachmentFileName(path: string) {
  // Attachment paths carry a random prefix so replacements never collide.
  return path.split("/").at(-1)?.replace(/^[0-9a-f-]{36}-/, "") ?? "attachment";
}

function attachmentView(
  kind: PreviewKind,
  path: string,
  label: string,
  target: PreviewBinaryTarget,
): PreviewView | null {
  const fileName = attachmentFileName(path);
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) {
    return { type: "pdf", id: `${target}-pdf`, label, fileName, target, sizeBytes: null };
  }
  if (lower.endsWith(".docx")) {
    return { type: "docx", id: `${target}-docx`, label, fileName, target, sizeBytes: null };
  }
  void kind;
  return null;
}

function textView(
  format: DocumentContentFormat,
  content: string,
  layout: "page" | "monospace",
): PreviewView {
  if (format === "markdown") {
    return { type: "markdown", id: "source-markdown", label: "Rendered", text: content };
  }
  return { type: "plain_text", id: "source-text", label: "Document", text: content, layout };
}

function sourceDownload(
  kind: "master_resume" | "resume_version" | "cover_letter",
  id: string,
  format: DocumentContentFormat,
): PreviewDownload {
  const extension = format === "markdown" ? ".md" : ".txt";
  return {
    id: "source",
    label: `Download ${extension}`,
    href: `/api/documents/${kind}/${id}/source`,
  };
}

type DocumentRow = {
  id: string;
  title: string;
  subtitle: string | null;
  updatedAt: string;
  locked: boolean;
  content: string | null;
  contentFormat: DocumentContentFormat;
  filePath: string | null;
  rowVersion: number;
  structuredContent: unknown;
  editorMode: "legacy" | "structured";
};

async function readDocumentRow(
  kind: "master_resume" | "resume_version" | "cover_letter",
  id: string,
): Promise<DocumentRow | null> {
  const { supabase, userId } = await context();

  if (kind === "master_resume") {
    const { data, error } = await supabase
      .from("resumes")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      title: data.name,
      subtitle: data.is_default ? "Default master resume" : "Master resume",
      updatedAt: data.updated_at,
      locked: false,
      content: data.content,
      contentFormat: data.content_format,
      filePath: data.file_path,
      rowVersion: data.row_version,
      structuredContent: data.structured_content,
      editorMode: data.editor_mode,
    };
  }

  if (kind === "resume_version") {
    const { data, error } = await supabase
      .from("resume_versions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const application = await readApplicationLabel(data.application_id);
    return {
      id: data.id,
      title: data.title ?? `Version ${data.version_number}`,
      subtitle: application
        ? `${application.role_title} · ${application.company_name}`
        : `Tailored resume v${data.version_number}`,
      updatedAt: data.updated_at,
      locked: Boolean(data.submitted_at),
      content: data.content,
      contentFormat: data.content_format,
      filePath: data.file_path,
      rowVersion: data.row_version,
      structuredContent: data.structured_content,
      editorMode: data.editor_mode,
    };
  }

  const { data, error } = await supabase
    .from("cover_letters")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const application = await readApplicationLabel(data.application_id);
  return {
    id: data.id,
    title: data.title ?? `Cover letter v${data.version_number}`,
    subtitle: application
      ? `${application.role_title} · ${application.company_name}`
      : `Cover letter v${data.version_number}`,
    updatedAt: data.updated_at,
    locked: Boolean(data.submitted_at),
    content: data.content,
    contentFormat: data.content_format,
    filePath: data.file_path,
    rowVersion: data.row_version,
    structuredContent: null,
    editorMode: "legacy",
  };
}

async function documentDescriptor(
  kind: "master_resume" | "resume_version" | "cover_letter",
  id: string,
): Promise<DocumentPreviewDescriptor | null> {
  const row = await readDocumentRow(kind, id);
  if (!row) return null;

  const views: PreviewView[] = [];
  const downloads: PreviewDownload[] = [];
  if (row.editorMode === "structured" && row.structuredContent) {
    const [document, profile] = await Promise.all([
      Promise.resolve(resumeDocumentV1Schema.parse(row.structuredContent)),
      getCanonicalCareerProfile(),
    ]);
    views.push({
      type: "structured_resume",
      id: "structured",
      label: "Resume",
      model: createResumeRenderModel(document, profile),
    });
  } else if (row.content) {
    views.push(
      textView(
        row.contentFormat,
        row.content,
        kind === "cover_letter" ? "page" : "monospace",
      ),
    );
  }

  if (row.content) downloads.push(sourceDownload(kind, id, row.contentFormat));

  if (row.filePath) {
    const view = attachmentView(kind, row.filePath, "Original attachment", "attachment");
    if (view) {
      views.push(view);
      downloads.push({
        id: "attachment",
        label: "Download attachment",
        href: previewBinaryPath(kind, id, "attachment", { download: true }),
      });
    }
  }

  return {
    kind,
    id,
    title: row.title,
    subtitle: row.subtitle,
    updatedAt: row.updatedAt,
    locked: row.locked,
    views: selectPreviewViews({ views }),
    downloads,
    staleCompiledOutput: null,
  };
}

async function resumeImportDescriptor(
  id: string,
): Promise<DocumentPreviewDescriptor | null> {
  const { supabase, userId } = await context();
  const { data, error } = await supabase
    .from("resume_imports")
    .select("id, file_path, file_name, mime_type, size_bytes, source_text, status, updated_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const views: PreviewView[] = [];
  const downloads: PreviewDownload[] = [];
  const fileName = data.file_name ?? "import";

  if (data.file_path && data.mime_type === PDF_MIME_TYPE) {
    views.push({
      type: "pdf",
      id: "import-pdf",
      label: "Uploaded file",
      fileName,
      target: "attachment",
      sizeBytes: data.size_bytes,
    });
  } else if (data.file_path && data.mime_type === DOCX_MIME_TYPE) {
    views.push({
      type: "docx",
      id: "import-docx",
      label: "Uploaded file",
      fileName,
      target: "attachment",
      sizeBytes: data.size_bytes,
    });
  }

  if (data.file_path) {
    downloads.push({
      id: "attachment",
      label: "Download file",
      href: previewBinaryPath("resume_import", id, "attachment", { download: true }),
    });
  }

  if (data.source_text) {
    views.push({
      type: "plain_text",
      id: "import-text",
      label: "Extracted text",
      text: data.source_text,
      layout: "monospace",
    });
  }

  return {
    kind: "resume_import",
    id,
    title: fileName,
    subtitle: `Resume import · ${data.status.replace(/_/g, " ")}`,
    updatedAt: data.updated_at,
    locked: data.status === "committed",
    views,
    downloads,
    staleCompiledOutput: null,
  };
}

async function assistantAttachmentDescriptor(
  id: string,
): Promise<DocumentPreviewDescriptor | null> {
  const { supabase, userId } = await context();
  const { data, error } = await supabase
    .from("assistant_attachments")
    .select("id, file_name, mime_type, size_bytes, extracted_text, created_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const views: PreviewView[] = [];
  if (data.mime_type === PDF_MIME_TYPE) {
    views.push({
      type: "pdf",
      id: "attachment-pdf",
      label: "Attachment",
      fileName: data.file_name,
      target: "attachment",
      sizeBytes: data.size_bytes,
    });
  } else if (data.mime_type === DOCX_MIME_TYPE) {
    views.push({
      type: "docx",
      id: "attachment-docx",
      label: "Attachment",
      fileName: data.file_name,
      target: "attachment",
      sizeBytes: data.size_bytes,
    });
  }
  if (data.extracted_text) {
    views.push({
      type: "plain_text",
      id: "attachment-text",
      label: "Extracted text",
      text: data.extracted_text,
      layout: "monospace",
    });
  }

  return {
    kind: "assistant_attachment",
    id,
    title: data.file_name,
    subtitle: "Maxwell attachment",
    updatedAt: data.created_at,
    locked: true,
    views,
    downloads: [
      {
        id: "attachment",
        label: "Download file",
        href: previewBinaryPath("assistant_attachment", id, "attachment", {
          download: true,
        }),
      },
    ],
    staleCompiledOutput: null,
  };
}

export async function getPreviewDescriptor(
  kind: PreviewKind,
  id: string,
): Promise<DocumentPreviewDescriptor | null> {
  if (kind === "resume_import") return resumeImportDescriptor(id);
  if (kind === "assistant_attachment") return assistantAttachmentDescriptor(id);
  return documentDescriptor(kind, id);
}

type PreviewBinary = {
  body: ArrayBuffer;
  contentType: string;
  fileName: string;
};

async function readStoredPath(
  kind: PreviewKind,
  id: string,
): Promise<{ bucket: string; path: string; fileName: string } | null> {
  const { supabase, userId } = await context();

  if (kind === "assistant_attachment") {
    const { data, error } = await supabase
      .from("assistant_attachments")
      .select("file_path, file_name")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { bucket: DOCUMENT_BUCKET, path: data.file_path, fileName: data.file_name };
  }

  if (kind === "resume_import") {
    const { data, error } = await supabase
      .from("resume_imports")
      .select("file_path, file_name")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data?.file_path) return null;
    return {
      bucket: DOCUMENT_BUCKET,
      path: data.file_path,
      fileName: data.file_name ?? attachmentFileName(data.file_path),
    };
  }

  const row = await readDocumentRow(kind, id);
  if (!row) return null;

  if (!row.filePath) return null;
  return {
    bucket: DOCUMENT_BUCKET,
    path: row.filePath,
    fileName: attachmentFileName(row.filePath),
  };
}

export async function getPreviewBinary(
  kind: PreviewKind,
  id: string,
): Promise<PreviewBinary | null> {
  const stored = await readStoredPath(kind, id);
  if (!stored) return null;

  const { supabase, userId } = await context();
  if (!stored.path.startsWith(`${userId}/`)) {
    throw new Error("Invalid document path.");
  }

  const { data, error } = await supabase.storage.from(stored.bucket).download(stored.path);
  if (error || !data) return null;

  const lower = stored.fileName.toLowerCase();
  const contentType = lower.endsWith(".docx")
    ? DOCX_MIME_TYPE
    : lower.endsWith(".pdf")
      ? PDF_MIME_TYPE
      : (data.type || "application/octet-stream");

  return { body: await data.arrayBuffer(), contentType, fileName: stored.fileName };
}
