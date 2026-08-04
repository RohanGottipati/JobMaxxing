import { createClient } from "@/lib/supabase/server";
import {
  DOCUMENT_BUCKET,
  DOCUMENT_SIGNED_URL_TTL,
} from "@/lib/documents/constants";
import type {
  CoverLetter,
  Resume,
  ResumeVersion,
} from "@/lib/applications/package-types";
import type {
  ApplicationOption,
  CoverLetterItem,
  DocumentEditorModel,
  DocumentKind,
  DocumentLibraryData,
  TailoredResumeItem,
} from "@/lib/documents/types";

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be signed in to manage documents.");
  }

  return { supabase, userId: user.id };
}

function applicationOptions(
  rows: Array<{ id: string; company_name: string; role_title: string }>,
): ApplicationOption[] {
  return rows.map((row) => ({
    id: row.id,
    companyName: row.company_name,
    jobTitle: row.role_title,
  }));
}

export async function getDocumentLibraryData(): Promise<DocumentLibraryData> {
  const { supabase } = await getAuthContext();
  const [resumes, resumeVersions, coverLetters, applications] =
    await Promise.all([
      supabase.from("resumes").select("*").order("updated_at", { ascending: false }),
      supabase
        .from("resume_versions")
        .select("*")
        .order("updated_at", { ascending: false }),
      supabase
        .from("cover_letters")
        .select("*")
        .order("updated_at", { ascending: false }),
      supabase
        .from("applications")
        .select("id, company_name, role_title")
        .order("updated_at", { ascending: false }),
    ]);

  const error =
    resumes.error ??
    resumeVersions.error ??
    coverLetters.error ??
    applications.error;
  if (error) throw error;

  const options = applicationOptions(applications.data ?? []);
  const applicationMap = new Map(options.map((item) => [item.id, item]));
  const resumeMap = new Map(
    (resumes.data ?? []).map((resume) => [resume.id, resume.name]),
  );

  return {
    masterResumes: resumes.data ?? [],
    resumeVersions: (resumeVersions.data ?? []).map((version) => ({
      ...version,
      application: applicationMap.get(version.application_id) ?? null,
      baseResumeName: version.base_resume_id
        ? (resumeMap.get(version.base_resume_id) ?? null)
        : null,
    })),
    coverLetters: (coverLetters.data ?? []).map((letter) => ({
      ...letter,
      application: applicationMap.get(letter.application_id) ?? null,
    })),
    applications: options,
  };
}

export async function getMasterResume(id: string): Promise<Resume | null> {
  const { supabase, userId } = await getAuthContext();
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTailoredResume(
  id: string,
): Promise<TailoredResumeItem | null> {
  const { supabase, userId } = await getAuthContext();
  const { data, error } = await supabase
    .from("resume_versions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [{ data: application }, { data: baseResume }] = await Promise.all([
    supabase
      .from("applications")
      .select("id, company_name, role_title")
      .eq("id", data.application_id)
      .maybeSingle(),
    data.base_resume_id
      ? supabase
          .from("resumes")
          .select("name")
          .eq("id", data.base_resume_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return {
    ...data,
    application: application
      ? applicationOptions([application])[0]
      : null,
    baseResumeName: baseResume?.name ?? null,
  };
}

export async function getCoverLetter(
  id: string,
): Promise<CoverLetterItem | null> {
  const { supabase, userId } = await getAuthContext();
  const { data, error } = await supabase
    .from("cover_letters")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("id, company_name, role_title")
    .eq("id", data.application_id)
    .maybeSingle();
  if (applicationError) throw applicationError;

  return {
    ...data,
    application: application ? applicationOptions([application])[0] : null,
  };
}

export async function createMasterResume(input: {
  name: string;
  content: string | null;
}): Promise<Resume> {
  const { supabase, userId } = await getAuthContext();
  const { count, error: countError } = await supabase
    .from("resumes")
    .select("id", { count: "exact", head: true });
  if (countError) throw countError;

  const { data, error } = await supabase
    .from("resumes")
    .insert({ ...input, user_id: userId, is_default: (count ?? 0) === 0 })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateMasterResume(
  id: string,
  input: { name: string; content: string | null },
): Promise<Resume> {
  const { supabase, userId } = await getAuthContext();
  const { data, error } = await supabase
    .from("resumes")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function duplicateMasterResume(id: string): Promise<Resume> {
  const { supabase, userId } = await getAuthContext();
  const { data: source, error: readError } = await supabase
    .from("resumes")
    .select("name, content, content_format, generation_metadata, editor_mode, document_schema_version, structured_content, template_id, row_version")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (readError || !source) {
    throw readError ?? new Error("Resume not found.");
  }

  const copyName = `${source.name.slice(0, 150).trimEnd()} copy`;
  const { data, error } = await supabase
    .from("resumes")
    .insert({
      user_id: userId,
      name: copyName,
      content: source.content,
      content_format: source.content_format,
      generation_metadata: source.generation_metadata,
      editor_mode: source.editor_mode,
      document_schema_version: source.document_schema_version,
      structured_content: source.structured_content,
      template_id: source.template_id,
      row_version: 0,
      is_default: false,
      file_path: null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function setDefaultResume(id: string): Promise<Resume> {
  const { supabase } = await getAuthContext();
  const { data, error } = await supabase.rpc("set_default_resume", {
    p_resume_id: id,
  });
  if (error) throw error;
  return data;
}

export async function deleteMasterResume(id: string): Promise<void> {
  const { supabase, userId } = await getAuthContext();
  const { data: resume, error: readError } = await supabase
    .from("resumes")
    .select("file_path, is_default")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (readError || !resume) {
    throw readError ?? new Error("Resume not found.");
  }

  const { error } = await supabase
    .from("resumes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;

  if (resume.file_path) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([resume.file_path]);
  }

  if (resume.is_default) {
    const { data: nextResume } = await supabase
      .from("resumes")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (nextResume) {
      const { error: defaultError } = await supabase.rpc("set_default_resume", {
        p_resume_id: nextResume.id,
      });
      if (defaultError) throw defaultError;
    }
  }
}

export async function updateTailoredResume(
  id: string,
  input: {
    title: string | null;
    content: string | null;
    base_resume_id: string | null;
  },
): Promise<ResumeVersion> {
  const { supabase, userId } = await getAuthContext();
  const { data, error } = await supabase
    .from("resume_versions")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .is("submitted_at", null)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTailoredResume(id: string): Promise<void> {
  const { supabase, userId } = await getAuthContext();
  const { data: version, error: readError } = await supabase
    .from("resume_versions")
    .select("file_path, submitted_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (readError || !version) {
    throw readError ?? new Error("Resume version not found.");
  }
  if (version.submitted_at) {
    throw new Error("Previously submitted resume versions cannot be deleted.");
  }
  const { error } = await supabase
    .from("resume_versions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .is("submitted_at", null);
  if (error) throw error;
  if (version.file_path) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([version.file_path]);
  }
}

export async function updateCoverLetter(
  id: string,
  input: { title: string | null; content: string | null },
): Promise<CoverLetter> {
  const { supabase, userId } = await getAuthContext();
  const { data, error } = await supabase
    .from("cover_letters")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .is("submitted_at", null)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCoverLetter(id: string): Promise<void> {
  const { supabase, userId } = await getAuthContext();
  const { data: letter, error: readError } = await supabase
    .from("cover_letters")
    .select("file_path, submitted_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (readError || !letter) {
    throw readError ?? new Error("Cover letter not found.");
  }
  if (letter.submitted_at) {
    throw new Error("Previously submitted cover letters cannot be deleted.");
  }
  const { error } = await supabase
    .from("cover_letters")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .is("submitted_at", null);
  if (error) throw error;
  if (letter.file_path) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([letter.file_path]);
  }
}

async function readFilePath(kind: DocumentKind, id: string) {
  const { supabase, userId } = await getAuthContext();
  if (kind === "master_resume") {
    return supabase
      .from("resumes")
      .select("file_path, is_default")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
  }
  if (kind === "resume_version") {
    return supabase
      .from("resume_versions")
      .select("file_path, submitted_at")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
  }
  return supabase
    .from("cover_letters")
    .select("file_path, submitted_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
}

export async function attachDocumentFile(
  kind: DocumentKind,
  id: string,
  path: string,
) {
  const { supabase, userId } = await getAuthContext();
  if (!path.startsWith(`${userId}/`)) {
    throw new Error("Invalid document path.");
  }

  const current = await readFilePath(kind, id);
  if (current.error || !current.data) {
    throw current.error ?? new Error("Document not found.");
  }
  if ("submitted_at" in current.data && current.data.submitted_at) {
    throw new Error("Previously submitted documents are locked.");
  }

  let updateError: { message: string } | null = null;
  if (kind === "master_resume") {
    ({ error: updateError } = await supabase
      .from("resumes")
      .update({ file_path: path })
      .eq("id", id)
      .eq("user_id", userId));
  } else if (kind === "resume_version") {
    ({ error: updateError } = await supabase
      .from("resume_versions")
      .update({ file_path: path })
      .eq("id", id)
      .eq("user_id", userId)
      .is("submitted_at", null));
  } else {
    ({ error: updateError } = await supabase
      .from("cover_letters")
      .update({ file_path: path })
      .eq("id", id)
      .eq("user_id", userId)
      .is("submitted_at", null));
  }
  if (updateError) throw updateError;

  if (current.data.file_path && current.data.file_path !== path) {
    await supabase.storage
      .from(DOCUMENT_BUCKET)
      .remove([current.data.file_path]);
  }
}

export async function removeDocumentFile(kind: DocumentKind, id: string) {
  const { supabase, userId } = await getAuthContext();
  const current = await readFilePath(kind, id);
  if (current.error || !current.data) {
    throw current.error ?? new Error("Document not found.");
  }
  if ("submitted_at" in current.data && current.data.submitted_at) {
    throw new Error("Previously submitted documents are locked.");
  }

  if (kind === "master_resume") {
    await supabase
      .from("resumes")
      .update({ file_path: null })
      .eq("id", id)
      .eq("user_id", userId);
  } else if (kind === "resume_version") {
    await supabase
      .from("resume_versions")
      .update({ file_path: null })
      .eq("id", id)
      .eq("user_id", userId)
      .is("submitted_at", null);
  } else {
    await supabase
      .from("cover_letters")
      .update({ file_path: null })
      .eq("id", id)
      .eq("user_id", userId)
      .is("submitted_at", null);
  }

  if (current.data.file_path) {
    const { error } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .remove([current.data.file_path]);
    if (error) throw error;
  }
}

export async function createSignedDocumentUrl(filePath: string | null) {
  if (!filePath) return null;
  const { supabase, userId } = await getAuthContext();
  if (!filePath.startsWith(`${userId}/`)) {
    throw new Error("Invalid document path.");
  }
  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(filePath, DOCUMENT_SIGNED_URL_TTL);
  if (error) throw error;
  return data.signedUrl;
}

export function toEditorModel(
  kind: DocumentKind,
  item: Resume | TailoredResumeItem | CoverLetterItem,
): DocumentEditorModel {
  if (kind === "master_resume") {
    const resume = item as Resume;
    return {
      id: resume.id,
      kind,
      title: resume.name,
      content: resume.content ?? "",
      contentFormat: resume.content_format,
      generationMetadata: resume.generation_metadata,
      filePath: resume.file_path,
      isSubmitted: false,
      versionNumber: null,
      application: null,
      baseResumeId: null,
      updatedAt: resume.updated_at,
    };
  }

  const version = item as TailoredResumeItem | CoverLetterItem;
  return {
    id: version.id,
    kind,
    title: version.title ?? "",
    content: version.content ?? "",
    contentFormat: version.content_format,
    generationMetadata: version.generation_metadata,
    filePath: version.file_path,
    isSubmitted: Boolean(version.submitted_at),
    versionNumber: version.version_number,
    application: version.application,
    baseResumeId:
      kind === "resume_version"
        ? (version as TailoredResumeItem).base_resume_id
        : null,
    updatedAt: version.updated_at,
  };
}
