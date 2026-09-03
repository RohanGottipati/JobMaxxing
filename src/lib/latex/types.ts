import type { LatexDocumentKind } from "@/lib/latex/constants";
import type { LatexEngine } from "@/types/database";

export type LatexAssetDTO = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

export type LatexHistoryEntryDTO = {
  id: string;
  rowVersion: number;
  title: string;
  reason: string;
  createdAt: string;
};

export type LatexCompiledOutputDTO = {
  rowVersion: number;
  compiledAt: string;
  /** False when the source advanced past the revision this PDF came from. */
  fresh: boolean;
};

export type LatexEditorDTO = {
  kind: LatexDocumentKind;
  id: string;
  title: string;
  subtitle: string | null;
  source: string;
  engine: LatexEngine;
  rowVersion: number;
  locked: boolean;
  compiled: LatexCompiledOutputDTO | null;
  assets: LatexAssetDTO[];
  history: LatexHistoryEntryDTO[];
  hasAttachment: boolean;
  /** Where the Studio's back link should return the user. */
  returnHref: string;
  updatedAt: string;
};

export function latexDocumentHref(kind: LatexDocumentKind, id: string) {
  if (kind === "master_resume") return `/resumes/${id}`;
  if (kind === "resume_version") return `/resumes/versions/${id}`;
  return `/cover-letters/${id}`;
}

export function latexLibraryHref(kind: LatexDocumentKind) {
  if (kind === "cover_letter") return "/cover-letters";
  if (kind === "resume_version") return "/resumes?tab=tailored";
  return "/resumes";
}

export function latexStudioHref(kind: LatexDocumentKind, id: string) {
  return `/latex/${kind}/${id}`;
}

export function documentWorkspaceHref(
  kind: LatexDocumentKind,
  id: string,
  contentFormat: string,
) {
  return contentFormat === "latex" ? latexStudioHref(kind, id) : latexDocumentHref(kind, id);
}

/** Studio requires a full document load so COOP/COEP isolation can take effect. */
export function isLatexStudioHref(href: string) {
  return href === "/latex" || href.startsWith("/latex/");
}
