import type { LatexEngine } from "@/types/database";

export const LATEX_BUCKET = "latex-workspaces";

export const LATEX_ENGINES = ["pdflatex", "xelatex"] as const;

export const LATEX_ENGINE_LABELS: Record<LatexEngine, string> = {
  pdflatex: "pdfLaTeX",
  xelatex: "XeLaTeX",
};

export const DEFAULT_LATEX_ENGINE: LatexEngine = "pdflatex";

export const MAX_LATEX_SOURCE_LENGTH = 2_000_000;

export const MAX_LATEX_ASSETS = 20;
export const MAX_LATEX_ASSET_SIZE = 5 * 1024 * 1024;
export const MAX_LATEX_ASSET_TOTAL_SIZE = 20 * 1024 * 1024;

export const MAX_COMPILED_PDF_SIZE = 20 * 1024 * 1024;

export const LATEX_DOCUMENT_KINDS = [
  "master_resume",
  "resume_version",
  "cover_letter",
] as const;

export type LatexDocumentKind = (typeof LATEX_DOCUMENT_KINDS)[number];

export function isLatexDocumentKind(value: string): value is LatexDocumentKind {
  return LATEX_DOCUMENT_KINDS.some((kind) => kind === value);
}

export function isLatexEngine(value: string): value is LatexEngine {
  return LATEX_ENGINES.some((engine) => engine === value);
}

const KIND_FOLDERS: Record<LatexDocumentKind, string> = {
  master_resume: "master-resumes",
  resume_version: "resume-versions",
  cover_letter: "cover-letters",
};

export function latexAssetPath(input: {
  userId: string;
  kind: LatexDocumentKind;
  documentId: string;
  fileName: string;
}) {
  return `${input.userId}/${KIND_FOLDERS[input.kind]}/${input.documentId}/assets/${input.fileName}`;
}

export function latexCompiledPdfPath(input: {
  userId: string;
  kind: LatexDocumentKind;
  documentId: string;
}) {
  return `${input.userId}/${KIND_FOLDERS[input.kind]}/${input.documentId}/compiled/main.pdf`;
}

export function latexWorkspacePrefix(input: {
  userId: string;
  kind: LatexDocumentKind;
  documentId: string;
}) {
  return `${input.userId}/${KIND_FOLDERS[input.kind]}/${input.documentId}`;
}
