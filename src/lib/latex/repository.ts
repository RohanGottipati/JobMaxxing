import "server-only";

import {
  latexAssetContentType,
  latexAssetSignatureMatches,
  safeLatexAssetName,
  validateLatexAssetName,
} from "@/lib/latex/asset-policy";
import {
  DEFAULT_LATEX_ENGINE,
  LATEX_BUCKET,
  MAX_COMPILED_PDF_SIZE,
  MAX_LATEX_ASSET_SIZE,
  MAX_LATEX_SOURCE_LENGTH,
  latexAssetPath,
  latexCompiledPdfPath,
  latexWorkspacePrefix,
  type LatexDocumentKind,
} from "@/lib/latex/constants";
import type {
  LatexAssetDTO,
  LatexDocumentDTO,
} from "@/lib/latex/types";
import { isCompiledOutputFresh } from "@/lib/latex/compile-freshness";
import { latexLibraryHref } from "@/lib/latex/types";
import { createClient } from "@/lib/supabase/server";
import type { LatexEngine } from "@/types/database";

async function context() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Authentication is required.");
  return { supabase, userId: user.id };
}

const PARENT_COLUMN: Record<LatexDocumentKind, string> = {
  master_resume: "resume_id",
  resume_version: "resume_version_id",
  cover_letter: "cover_letter_id",
};

type DocumentSummary = {
  id: string;
  title: string;
  subtitle: string | null;
  source: string;
  contentFormat: string;
  engine: LatexEngine;
  rowVersion: number;
  locked: boolean;
  compiledPdfPath: string | null;
  compiledRowVersion: number | null;
  compiledAt: string | null;
  filePath: string | null;
  isDefault: boolean;
  applicationId: string | null;
  updatedAt: string;
};

async function readDocument(
  kind: LatexDocumentKind,
  id: string,
): Promise<DocumentSummary | null> {
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
      source: data.content ?? "",
      contentFormat: data.content_format,
      engine: data.latex_engine ?? DEFAULT_LATEX_ENGINE,
      rowVersion: data.row_version,
      locked: false,
      compiledPdfPath: data.compiled_pdf_path,
      compiledRowVersion: data.compiled_row_version,
      compiledAt: data.compiled_at,
      filePath: data.file_path,
      isDefault: data.is_default,
      applicationId: null,
      updatedAt: data.updated_at,
    };
  }

  const table = kind === "resume_version" ? "resume_versions" : "cover_letters";
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: application } = await supabase
    .from("applications")
    .select("company_name, role_title")
    .eq("id", data.application_id)
    .eq("user_id", userId)
    .maybeSingle();
  const fallbackTitle =
    kind === "resume_version"
      ? `Tailored resume v${data.version_number}`
      : `Cover letter v${data.version_number}`;

  return {
    id: data.id,
    title: data.title ?? fallbackTitle,
    subtitle: application
      ? `${application.role_title} · ${application.company_name}`
      : fallbackTitle,
    source: data.content ?? "",
    contentFormat: data.content_format,
    engine: data.latex_engine ?? DEFAULT_LATEX_ENGINE,
    rowVersion: data.row_version,
    locked: Boolean(data.submitted_at),
    compiledPdfPath: data.compiled_pdf_path,
    compiledRowVersion: data.compiled_row_version,
    compiledAt: data.compiled_at,
    filePath: data.file_path,
    isDefault: false,
    applicationId: data.application_id,
    updatedAt: data.updated_at,
  };
}

async function readAssets(
  kind: LatexDocumentKind,
  id: string,
): Promise<LatexAssetDTO[]> {
  const { supabase, userId } = await context();
  const { data, error } = await supabase
    .from("latex_document_assets")
    .select("id, file_name, content_type, size_bytes, created_at")
    .eq("user_id", userId)
    .eq(PARENT_COLUMN[kind], id)
    .order("file_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  }));
}

export async function getLatexDocument(
  kind: LatexDocumentKind,
  id: string,
): Promise<LatexDocumentDTO | null> {
  const document = await readDocument(kind, id);
  if (!document || document.contentFormat !== "latex") return null;

  const assets = await readAssets(kind, id);

  return {
    kind,
    id: document.id,
    title: document.title,
    subtitle: document.subtitle,
    source: document.source,
    engine: document.engine,
    rowVersion: document.rowVersion,
    locked: document.locked,
    compiled:
      document.compiledPdfPath && document.compiledRowVersion !== null && document.compiledAt
        ? {
            rowVersion: document.compiledRowVersion,
            compiledAt: document.compiledAt,
            fresh: isCompiledOutputFresh({
              compiledRowVersion: document.compiledRowVersion,
              rowVersion: document.rowVersion,
            }),
          }
        : null,
    assets,
    filePath: document.filePath,
    isDefault: document.isDefault,
    returnHref: document.applicationId
      ? `/applications/${document.applicationId}`
      : latexLibraryHref(kind),
    updatedAt: document.updatedAt,
  };
}

export async function isLatexDocument(kind: LatexDocumentKind, id: string) {
  const document = await readDocument(kind, id);
  return document?.contentFormat === "latex";
}

export async function saveLatexSource(input: {
  kind: LatexDocumentKind;
  id: string;
  expectedVersion: number;
  title: string;
  source: string;
  engine: LatexEngine | null;
}) {
  if (input.source.length > MAX_LATEX_SOURCE_LENGTH) {
    throw new Error("LaTeX source must be 2 MB or smaller.");
  }
  const { supabase } = await context();
  const { data, error } = await supabase.rpc("save_latex_document_source", {
    p_kind: input.kind,
    p_document_id: input.id,
    p_expected_version: input.expectedVersion,
    p_title: input.title,
    p_source: input.source,
    p_engine: input.engine,
  });
  if (error) throw error;
  return data;
}

export async function checkpointLatexSource(input: {
  kind: LatexDocumentKind;
  id: string;
  expectedVersion: number;
  reason: string;
}) {
  const { supabase } = await context();
  const { data, error } = await supabase.rpc("checkpoint_latex_document_source", {
    p_kind: input.kind,
    p_document_id: input.id,
    p_expected_version: input.expectedVersion,
    p_reason: input.reason,
  });
  if (error) throw error;
  return data;
}

export async function restoreLatexSource(input: {
  kind: LatexDocumentKind;
  id: string;
  expectedVersion: number;
  historyId: string;
}) {
  const { supabase } = await context();
  const { data, error } = await supabase.rpc("restore_latex_document_source", {
    p_kind: input.kind,
    p_document_id: input.id,
    p_expected_version: input.expectedVersion,
    p_history_id: input.historyId,
  });
  if (error) throw error;
  return data;
}

export async function attachLatexAsset(input: {
  kind: LatexDocumentKind;
  id: string;
  fileName: string;
  bytes: Uint8Array;
  expectedVersion?: number;
}) {
  const fileName = safeLatexAssetName(input.fileName);
  const nameError = validateLatexAssetName(fileName);
  if (nameError) throw new Error(nameError);
  if (input.bytes.byteLength === 0) throw new Error("The uploaded asset is empty.");
  if (input.bytes.byteLength > MAX_LATEX_ASSET_SIZE) {
    throw new Error("Each asset must be 5 MB or smaller.");
  }
  if (!latexAssetSignatureMatches(fileName, input.bytes)) {
    throw new Error("The uploaded file does not match its extension.");
  }

  const contentType = latexAssetContentType(fileName);
  if (!contentType) throw new Error("Unsupported asset type.");

  const { supabase, userId } = await context();
  if (input.expectedVersion !== undefined) {
    const document = await readDocument(input.kind, input.id);
    if (!document) throw new Error("The requested item was not found.");
    if (document.locked) throw new Error("Previously submitted documents are locked.");
    if (document.rowVersion !== input.expectedVersion) {
      throw new Error("The document changed in another session or is unavailable.");
    }
  }
  const path = latexAssetPath({ userId, kind: input.kind, documentId: input.id, fileName });

  const { error: uploadError } = await supabase.storage
    .from(LATEX_BUCKET)
    .upload(path, input.bytes, { contentType, upsert: true });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.rpc("attach_latex_document_asset", {
    p_kind: input.kind,
    p_document_id: input.id,
    p_file_name: fileName,
    p_storage_path: path,
    p_content_type: contentType,
    p_size_bytes: input.bytes.byteLength,
  });

  if (error) {
    // Leaving the object behind would count against the user's quota without
    // ever appearing in the asset list.
    await supabase.storage.from(LATEX_BUCKET).remove([path]);
    throw error;
  }

  return { rowVersion: data, fileName };
}

export async function removeLatexAsset(input: {
  kind: LatexDocumentKind;
  id: string;
  assetId: string;
  expectedVersion?: number;
}) {
  const { supabase, userId } = await context();
  if (input.expectedVersion !== undefined) {
    const document = await readDocument(input.kind, input.id);
    if (!document) throw new Error("The requested item was not found.");
    if (document.locked) throw new Error("Previously submitted documents are locked.");
    if (document.rowVersion !== input.expectedVersion) {
      throw new Error("The document changed in another session or is unavailable.");
    }
  }
  const { data: asset, error: readError } = await supabase
    .from("latex_document_assets")
    .select("storage_path")
    .eq("id", input.assetId)
    .eq("user_id", userId)
    .eq(PARENT_COLUMN[input.kind], input.id)
    .maybeSingle();
  if (readError) throw readError;
  if (!asset) throw new Error("The requested asset was not found.");

  const { data, error } = await supabase.rpc("remove_latex_document_asset", {
    p_kind: input.kind,
    p_document_id: input.id,
    p_asset_id: input.assetId,
  });
  if (error) throw error;

  await supabase.storage.from(LATEX_BUCKET).remove([asset.storage_path]);
  return { rowVersion: data };
}

export async function registerCompiledPdf(input: {
  kind: LatexDocumentKind;
  id: string;
  sourceVersion: number;
  bytes: Uint8Array;
}) {
  if (input.bytes.byteLength === 0) throw new Error("The compiled PDF is empty.");
  if (input.bytes.byteLength > MAX_COMPILED_PDF_SIZE) {
    throw new Error("Compiled PDFs must be 20 MB or smaller.");
  }
  const header = new TextDecoder().decode(input.bytes.subarray(0, 5));
  if (header !== "%PDF-") throw new Error("The compiled output is not a valid PDF.");

  const { supabase, userId } = await context();
  const path = latexCompiledPdfPath({ userId, kind: input.kind, documentId: input.id });

  const { error: uploadError } = await supabase.storage
    .from(LATEX_BUCKET)
    .upload(path, input.bytes, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.rpc("register_latex_compiled_pdf", {
    p_kind: input.kind,
    p_document_id: input.id,
    p_source_version: input.sourceVersion,
    p_storage_path: path,
  });
  if (error) throw error;

  return { rowVersion: data, compiledAt: new Date().toISOString() };
}

export async function downloadLatexAsset(input: {
  kind: LatexDocumentKind;
  id: string;
  assetId: string;
}) {
  const { supabase, userId } = await context();
  const { data: asset, error } = await supabase
    .from("latex_document_assets")
    .select("storage_path, file_name, content_type")
    .eq("id", input.assetId)
    .eq("user_id", userId)
    .eq(PARENT_COLUMN[input.kind], input.id)
    .maybeSingle();
  if (error) throw error;
  if (!asset) return null;

  const { data: blob, error: downloadError } = await supabase.storage
    .from(LATEX_BUCKET)
    .download(asset.storage_path);
  if (downloadError || !blob) return null;

  return {
    body: await blob.arrayBuffer(),
    contentType: asset.content_type,
    fileName: asset.file_name,
  };
}

/** Every stored asset, used to build the downloadable project ZIP. */
export async function readLatexProject(kind: LatexDocumentKind, id: string) {
  const document = await readDocument(kind, id);
  if (!document || document.contentFormat !== "latex") return null;

  const { supabase, userId } = await context();
  const { data, error } = await supabase
    .from("latex_document_assets")
    .select("file_name, storage_path")
    .eq("user_id", userId)
    .eq(PARENT_COLUMN[kind], id)
    .order("file_name", { ascending: true });
  if (error) throw error;

  const files = await Promise.all(
    (data ?? []).map(async (row) => {
      const { data: blob } = await supabase.storage
        .from(LATEX_BUCKET)
        .download(row.storage_path);
      return blob ? { fileName: row.file_name, bytes: await blob.arrayBuffer() } : null;
    }),
  );

  return {
    title: document.title,
    source: document.source,
    assets: files.filter((file): file is { fileName: string; bytes: ArrayBuffer } => file !== null),
  };
}

export type LatexLibraryItem = {
  kind: LatexDocumentKind;
  id: string;
  title: string;
  subtitle: string | null;
  updatedAt: string;
  locked: boolean;
};

export async function listLatexDocuments(): Promise<LatexLibraryItem[]> {
  const { supabase, userId } = await context();
  const [masters, versions, letters] = await Promise.all([
    supabase
      .from("resumes")
      .select("id, name, is_default, updated_at")
      .eq("user_id", userId)
      .eq("content_format", "latex")
      .order("updated_at", { ascending: false }),
    supabase
      .from("resume_versions")
      .select("id, title, version_number, submitted_at, application_id, updated_at")
      .eq("user_id", userId)
      .eq("content_format", "latex")
      .order("updated_at", { ascending: false }),
    supabase
      .from("cover_letters")
      .select("id, title, version_number, submitted_at, application_id, updated_at")
      .eq("user_id", userId)
      .eq("content_format", "latex")
      .order("updated_at", { ascending: false }),
  ]);
  const error = masters.error ?? versions.error ?? letters.error;
  if (error) throw error;

  const applicationIds = [
    ...new Set(
      [...(versions.data ?? []), ...(letters.data ?? [])]
        .map((row) => row.application_id)
        .filter(Boolean),
    ),
  ];
  const applications = applicationIds.length
    ? await supabase
        .from("applications")
        .select("id, company_name, role_title")
        .eq("user_id", userId)
        .in("id", applicationIds)
    : { data: [] as Array<{ id: string; company_name: string; role_title: string }>, error: null };
  if (applications.error) throw applications.error;
  const applicationMap = new Map(
    (applications.data ?? []).map((row) => [
      row.id,
      `${row.role_title} · ${row.company_name}`,
    ]),
  );

  return [
    ...(masters.data ?? []).map((row) => ({
      kind: "master_resume" as const,
      id: row.id,
      title: row.name,
      subtitle: row.is_default ? "Default master resume" : "Master resume",
      updatedAt: row.updated_at,
      locked: false,
    })),
    ...(versions.data ?? []).map((row) => ({
      kind: "resume_version" as const,
      id: row.id,
      title: row.title ?? `Tailored resume v${row.version_number}`,
      subtitle: applicationMap.get(row.application_id) ?? "Tailored resume",
      updatedAt: row.updated_at,
      locked: Boolean(row.submitted_at),
    })),
    ...(letters.data ?? []).map((row) => ({
      kind: "cover_letter" as const,
      id: row.id,
      title: row.title ?? `Cover letter v${row.version_number}`,
      subtitle: applicationMap.get(row.application_id) ?? "Cover letter",
      updatedAt: row.updated_at,
      locked: Boolean(row.submitted_at),
    })),
  ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function createLatexDocument(input: {
  kind: LatexDocumentKind;
  title: string;
  source: string;
  engine: LatexEngine;
  applicationId?: string | null;
  baseResumeId?: string | null;
}) {
  if (input.source.length > MAX_LATEX_SOURCE_LENGTH) {
    throw new Error("LaTeX source must be 2 MB or smaller.");
  }
  const { supabase, userId } = await context();

  if (input.kind === "master_resume") {
    const { count, error: countError } = await supabase
      .from("resumes")
      .select("id", { count: "exact", head: true });
    if (countError) throw countError;
    const { data, error } = await supabase
      .from("resumes")
      .insert({
        user_id: userId,
        name: input.title,
        content: input.source,
        content_format: "latex",
        latex_engine: input.engine,
        editor_mode: "legacy",
        is_default: (count ?? 0) === 0,
        row_version: 0,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { kind: input.kind, id: data.id };
  }

  if (!input.applicationId) {
    throw new Error("Choose an application you own.");
  }

  if (input.kind === "resume_version") {
    const { data, error } = await supabase
      .from("resume_versions")
      .insert({
        user_id: userId,
        application_id: input.applicationId,
        base_resume_id: input.baseResumeId ?? null,
        title: input.title,
        content: input.source,
        content_format: "latex",
        latex_engine: input.engine,
        editor_mode: "legacy",
        row_version: 0,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { kind: input.kind, id: data.id };
  }

  const { data, error } = await supabase
    .from("cover_letters")
    .insert({
      user_id: userId,
      application_id: input.applicationId,
      title: input.title,
      content: input.source,
      content_format: "latex",
      latex_engine: input.engine,
      row_version: 0,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { kind: input.kind, id: data.id };
}

export async function copyLatexWorkspace(input: {
  kind: LatexDocumentKind;
  sourceId: string;
  destinationId: string;
}) {
  const { supabase, userId } = await context();
  const { data: assets, error } = await supabase
    .from("latex_document_assets")
    .select("file_name, storage_path, content_type, size_bytes")
    .eq("user_id", userId)
    .eq(PARENT_COLUMN[input.kind], input.sourceId);
  if (error) throw error;

  for (const asset of assets ?? []) {
    const nextPath = latexAssetPath({
      userId,
      kind: input.kind,
      documentId: input.destinationId,
      fileName: asset.file_name,
    });
    const { data: blob, error: downloadError } = await supabase.storage
      .from(LATEX_BUCKET)
      .download(asset.storage_path);
    if (downloadError || !blob) continue;

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(LATEX_BUCKET)
      .upload(nextPath, bytes, { contentType: asset.content_type, upsert: false });
    if (uploadError) continue;

    const parent =
      input.kind === "master_resume"
        ? { resume_id: input.destinationId }
        : input.kind === "resume_version"
          ? { resume_version_id: input.destinationId }
          : { cover_letter_id: input.destinationId };

    const { error: insertError } = await supabase.from("latex_document_assets").insert({
      user_id: userId,
      ...parent,
      file_name: asset.file_name,
      storage_path: nextPath,
      content_type: asset.content_type,
      size_bytes: asset.size_bytes,
    });
    if (insertError) {
      await supabase.storage.from(LATEX_BUCKET).remove([nextPath]);
    }
  }
}

/**
 * Removes compiled output and supporting assets for one document. Call after
 * the parent row is gone (child rows cascade) or pass known paths beforehand.
 */
export async function removeLatexWorkspace(input: {
  kind: LatexDocumentKind;
  id: string;
  compiledPdfPath?: string | null;
  assetPaths?: string[];
}) {
  const { supabase, userId } = await context();
  const prefix = latexWorkspacePrefix({ userId, kind: input.kind, documentId: input.id });
  const known = [
    input.compiledPdfPath,
    ...(input.assetPaths ?? []),
    latexCompiledPdfPath({ userId, kind: input.kind, documentId: input.id }),
  ].filter((path): path is string => typeof path === "string" && path.startsWith(`${userId}/`));

  const unique = [...new Set(known)];
  if (unique.length) {
    await supabase.storage.from(LATEX_BUCKET).remove(unique);
  }

  for (const folder of [`${prefix}/assets`, `${prefix}/compiled`]) {
    const { data } = await supabase.storage.from(LATEX_BUCKET).list(folder, { limit: 100 });
    const leftover = (data ?? [])
      .map((entry) => `${folder}/${entry.name}`)
      .filter((path) => path.startsWith(`${userId}/`));
    if (leftover.length) await supabase.storage.from(LATEX_BUCKET).remove(leftover);
  }
}

export async function readLatexWorkspacePaths(kind: LatexDocumentKind, id: string) {
  const { supabase, userId } = await context();
  const document = await readDocument(kind, id);
  const { data, error } = await supabase
    .from("latex_document_assets")
    .select("storage_path")
    .eq("user_id", userId)
    .eq(PARENT_COLUMN[kind], id);
  if (error) throw error;
  return {
    compiledPdfPath: document?.compiledPdfPath ?? null,
    assetPaths: (data ?? []).map((row) => row.storage_path),
  };
}
