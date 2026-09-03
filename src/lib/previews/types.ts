import type { ResumeRenderModel } from "@/lib/resumes/render-model";
import type { LatexEngine } from "@/types/database";

export const PREVIEW_KINDS = [
  "master_resume",
  "resume_version",
  "cover_letter",
  "resume_import",
  "assistant_attachment",
] as const;

export type PreviewKind = (typeof PREVIEW_KINDS)[number];

export function isPreviewKind(value: string): value is PreviewKind {
  return PREVIEW_KINDS.some((kind) => kind === value);
}

/**
 * Binary views point at `/api/previews/[kind]/[id]/file`, which streams the
 * private object through the app instead of handing out a storage URL.
 */
export type PreviewBinaryTarget = "attachment" | "compiled";

export type PreviewView =
  | {
      type: "pdf";
      id: string;
      label: string;
      fileName: string;
      target: PreviewBinaryTarget;
      sizeBytes: number | null;
    }
  | {
      type: "docx";
      id: string;
      label: string;
      fileName: string;
      target: PreviewBinaryTarget;
      sizeBytes: number | null;
    }
  | {
      type: "structured_resume";
      id: string;
      label: string;
      model: ResumeRenderModel;
    }
  | {
      type: "latex";
      id: string;
      label: string;
      source: string;
      engine: LatexEngine;
    }
  | {
      type: "markdown";
      id: string;
      label: string;
      text: string;
    }
  | {
      type: "plain_text";
      id: string;
      label: string;
      text: string;
      /** Cover letters read better as a letter-sized page than as a code block. */
      layout: "page" | "monospace";
    };

export type PreviewViewType = PreviewView["type"];

export type PreviewDownload = {
  id: string;
  label: string;
  href: string;
};

/**
 * `staleCompiledOutput` is set when a LaTeX document has a stored PDF that was
 * produced from an older source revision, so the dialog can warn instead of
 * silently showing outdated output.
 */
export type DocumentPreviewDescriptor = {
  kind: PreviewKind;
  id: string;
  title: string;
  subtitle: string | null;
  updatedAt: string | null;
  locked: boolean;
  views: PreviewView[];
  downloads: PreviewDownload[];
  staleCompiledOutput: { compiledAt: string | null } | null;
};

export function previewDescriptorPath(kind: PreviewKind, id: string) {
  return `/api/previews/${kind}/${id}`;
}

export function previewBinaryPath(
  kind: PreviewKind,
  id: string,
  target: PreviewBinaryTarget,
  options?: { download?: boolean },
) {
  const search = new URLSearchParams({ target });
  if (options?.download) search.set("download", "1");
  return `/api/previews/${kind}/${id}/file?${search.toString()}`;
}
