import "server-only";

import type { FunctionDeclaration, FunctionCall } from "@google/genai";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  deleteApplication,
  getCoverLetters,
  getResumeVersions,
  markCoverLetterSubmitted,
  markResumeVersionSubmitted,
} from "@/lib/applications/packages";
import { getApplicationById, getApplications } from "@/lib/applications/repository";
import {
  deleteCoverLetter,
  deleteMasterResume,
  deleteTailoredResume,
  getCoverLetter,
  getDocumentLibraryData,
  getMasterResume,
  getTailoredResume,
} from "@/lib/documents/repository";
import { getCareerProfile } from "@/lib/profile/career";
import {
  createMaxwellAction,
  getMaxwellAttachmentContext,
  getMaxwellAuthContext,
  toAction,
  updateMaxwellAction,
} from "@/lib/maxwell/repository";
import {
  shouldConfirmMaxwellWrite,
  type MaxwellWriteToolName,
} from "@/lib/maxwell/policy";
import type { MaxwellAction } from "@/lib/maxwell/types";
import type {
  ApplicationStatus,
  Database,
  DocumentContentFormat,
  Json,
} from "@/types/database";

const statusSchema = z.enum([
  "saved",
  "applied",
  "online_assessment",
  "interview",
  "final_round",
  "offer",
  "rejected",
  "withdrawn",
]);
const formatSchema = z.enum(["plain_text", "markdown", "latex"]);
const evidenceSchema = z.string().max(500).default("");
const optionalText = z.string().max(100_000).optional();
const optionalShortText = z.string().max(500).optional();

const documentInputSchema = z.object({
  title: z.string().min(1).max(160),
  content: optionalText,
  content_format: formatSchema.default("plain_text"),
  attachment_id: z.string().uuid().optional(),
  unsupported_claims: z.array(z.string().max(500)).max(30).default([]),
  base_resume_id: z.string().uuid().optional(),
});

const schemas = {
  search_workspace: z.object({
    query: z.string().max(300).default(""),
    entity: z
      .enum(["all", "applications", "documents", "profile"])
      .default("all"),
  }),
  get_application: z.object({ application_id: z.string().uuid() }),
  get_document: z.object({
    kind: z.enum(["master_resume", "resume_version", "cover_letter"]),
    document_id: z.string().uuid(),
  }),
  create_application_package: z.object({
    company_name: z.string().min(1).max(200),
    role_title: z.string().min(1).max(200),
    job_description: optionalText,
    job_url: z.string().url().max(2_000).optional(),
    location: optionalShortText,
    status: statusSchema.default("saved"),
    date_applied: z.string().date().optional(),
    deadline: z.string().date().optional(),
    notes: optionalText,
    referral_contact: optionalShortText,
    next_action: optionalShortText,
    resume: documentInputSchema.optional(),
    cover_letter: documentInputSchema.omit({ base_resume_id: true }).optional(),
    mark_submitted: z.boolean().default(false),
    allow_duplicate: z.boolean().default(false),
    authorization_evidence: evidenceSchema,
  }),
  create_document: z.object({
    kind: z.enum(["master_resume", "resume_version", "cover_letter"]),
    application_id: z.string().uuid().optional(),
    document: documentInputSchema,
    authorization_evidence: evidenceSchema,
  }),
  update_application: z.object({
    application_id: z.string().uuid(),
    company_name: z.string().min(1).max(200).optional(),
    role_title: z.string().min(1).max(200).optional(),
    job_url: z.string().url().max(2_000).or(z.literal("")).optional(),
    job_description: optionalText,
    location: optionalShortText,
    deadline: z.string().date().or(z.literal("")).optional(),
    date_applied: z.string().date().or(z.literal("")).optional(),
    notes: optionalText,
    referral_contact: optionalShortText,
    next_action: optionalShortText,
    authorization_evidence: evidenceSchema,
  }),
  move_application: z.object({
    application_id: z.string().uuid(),
    status: statusSchema,
    authorization_evidence: evidenceSchema,
  }),
  update_document: z.object({
    kind: z.enum(["master_resume", "resume_version", "cover_letter"]),
    document_id: z.string().uuid(),
    title: z.string().min(1).max(160).optional(),
    content: optionalText,
    content_format: formatSchema.optional(),
    unsupported_claims: z.array(z.string().max(500)).max(30).optional(),
    authorization_evidence: evidenceSchema,
  }),
  update_profile_basics: z.object({
    full_name: optionalShortText,
    headline: optionalShortText,
    phone: optionalShortText,
    location: optionalShortText,
    summary: optionalText,
    additional_info: optionalText,
    authorization_evidence: evidenceSchema,
  }),
  add_profile_item: z.object({
    section: z.enum([
      "skills",
      "achievements",
      "experience",
      "volunteer",
      "education",
      "projects",
    ]),
    item: z.record(z.string(), z.unknown()),
    authorization_evidence: evidenceSchema,
  }),
  submit_document: z.object({
    kind: z.enum(["resume_version", "cover_letter"]),
    document_id: z.string().uuid(),
    authorization_evidence: evidenceSchema,
  }),
  delete_record: z.object({
    kind: z.enum([
      "application",
      "master_resume",
      "resume_version",
      "cover_letter",
    ]),
    record_id: z.string().uuid(),
    authorization_evidence: evidenceSchema,
  }),
};

type ToolName = keyof typeof schemas;

const documentProperties = {
  title: { type: "string", description: "Document title, maximum 160 characters." },
  content: { type: "string", description: "Complete editable document source." },
  content_format: { type: "string", enum: ["plain_text", "markdown", "latex"] },
  attachment_id: { type: "string", description: "ID of an uploaded PDF or DOCX to attach." },
  unsupported_claims: {
    type: "array",
    items: { type: "string" },
    description: "Every factual claim not directly supported by supplied workspace data.",
  },
  base_resume_id: { type: "string", description: "Optional master resume UUID." },
};

const writeEvidence = {
  authorization_evidence: {
    type: "string",
    description: "Exact quote from the current user message authorizing this write, or empty string.",
  },
};

export const MAXWELL_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "search_workspace",
    description: "Search the user's applications, documents, and career profile.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        entity: { type: "string", enum: ["all", "applications", "documents", "profile"] },
      },
    },
  },
  {
    name: "get_application",
    description: "Load one application with all tailored resumes and cover letters.",
    parametersJsonSchema: {
      type: "object",
      properties: { application_id: { type: "string" } },
      required: ["application_id"],
    },
  },
  {
    name: "get_document",
    description: "Load the editable text and metadata for a saved resume or cover letter.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["master_resume", "resume_version", "cover_letter"] },
        document_id: { type: "string" },
      },
      required: ["kind", "document_id"],
    },
  },
  {
    name: "create_application_package",
    description: "Atomically create an application card and optional linked tailored resume and cover letter.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        company_name: { type: "string" },
        role_title: { type: "string" },
        job_description: { type: "string" },
        job_url: { type: "string" },
        location: { type: "string" },
        status: {
          type: "string",
          enum: ["saved", "applied", "online_assessment", "interview", "final_round", "offer", "rejected", "withdrawn"],
        },
        date_applied: { type: "string", format: "date" },
        deadline: { type: "string", format: "date" },
        notes: { type: "string" },
        referral_contact: { type: "string" },
        next_action: { type: "string" },
        resume: { type: "object", properties: documentProperties, required: ["title"] },
        cover_letter: {
          type: "object",
          properties: Object.fromEntries(Object.entries(documentProperties).filter(([key]) => key !== "base_resume_id")),
          required: ["title"],
        },
        mark_submitted: { type: "boolean" },
        allow_duplicate: { type: "boolean" },
        ...writeEvidence,
      },
      required: ["company_name", "role_title", "authorization_evidence"],
    },
  },
  {
    name: "create_document",
    description: "Create a master resume or an application-linked tailored resume or cover letter.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["master_resume", "resume_version", "cover_letter"] },
        application_id: { type: "string" },
        document: { type: "object", properties: documentProperties, required: ["title"] },
        ...writeEvidence,
      },
      required: ["kind", "document", "authorization_evidence"],
    },
  },
  {
    name: "update_application",
    description: "Update the details of an existing application card without changing its pipeline status.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        application_id: { type: "string" },
        company_name: { type: "string" },
        role_title: { type: "string" },
        job_url: { type: "string" },
        job_description: { type: "string" },
        location: { type: "string" },
        deadline: { type: "string" },
        date_applied: { type: "string" },
        notes: { type: "string" },
        referral_contact: { type: "string" },
        next_action: { type: "string" },
        ...writeEvidence,
      },
      required: ["application_id", "authorization_evidence"],
    },
  },
  {
    name: "move_application",
    description: "Move an application card to a different pipeline status.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        application_id: { type: "string" },
        status: {
          type: "string",
          enum: ["saved", "applied", "online_assessment", "interview", "final_round", "offer", "rejected", "withdrawn"],
        },
        ...writeEvidence,
      },
      required: ["application_id", "status", "authorization_evidence"],
    },
  },
  {
    name: "update_document",
    description: "Update the editable source of a draft resume or cover letter.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["master_resume", "resume_version", "cover_letter"] },
        document_id: { type: "string" },
        title: { type: "string" },
        content: { type: "string" },
        content_format: { type: "string", enum: ["plain_text", "markdown", "latex"] },
        unsupported_claims: { type: "array", items: { type: "string" } },
        ...writeEvidence,
      },
      required: ["kind", "document_id", "authorization_evidence"],
    },
  },
  {
    name: "update_profile_basics",
    description: "Update the user's profile basics, summary, or additional information.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        full_name: { type: "string" },
        headline: { type: "string" },
        phone: { type: "string" },
        location: { type: "string" },
        summary: { type: "string" },
        additional_info: { type: "string" },
        ...writeEvidence,
      },
      required: ["authorization_evidence"],
    },
  },
  {
    name: "add_profile_item",
    description: "Add a skill, achievement, experience, volunteer role, education item, or project to the career profile.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        section: {
          type: "string",
          enum: ["skills", "achievements", "experience", "volunteer", "education", "projects"],
        },
        item: { type: "object", additionalProperties: true },
        ...writeEvidence,
      },
      required: ["section", "item", "authorization_evidence"],
    },
  },
  {
    name: "submit_document",
    description: "Mark a tailored resume or cover letter submitted and permanently lock its content.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["resume_version", "cover_letter"] },
        document_id: { type: "string" },
        ...writeEvidence,
      },
      required: ["kind", "document_id", "authorization_evidence"],
    },
  },
  {
    name: "delete_record",
    description: "Delete an application or editable document. This always requires confirmation.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["application", "master_resume", "resume_version", "cover_letter"],
        },
        record_id: { type: "string" },
        ...writeEvidence,
      },
      required: ["kind", "record_id", "authorization_evidence"],
    },
  },
];

const READ_TOOLS = new Set<ToolName>([
  "search_workspace",
  "get_application",
  "get_document",
]);

type ToolExecutionContext = {
  threadId: string;
  assistantMessageId: string;
  currentUserMessage: string;
  attachmentCount: number;
  emit?: (event: ToolExecutionEvent) => Promise<void> | void;
};

export type ToolExecutionEvent =
  | { type: "action_pending"; action: MaxwellAction }
  | { type: "action_started"; actionId: string; toolName: string }
  | { type: "action_result"; action: MaxwellAction };

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function normalized(value: string) {
  return value.trim().toLocaleLowerCase();
}

function requiresConfirmation(
  name: ToolName,
  args: { authorization_evidence?: string },
  context: ToolExecutionContext,
) {
  return shouldConfirmMaxwellWrite({
    name: name as MaxwellWriteToolName,
    currentMessage: context.currentUserMessage,
    evidence: args.authorization_evidence,
    attachmentCount: context.attachmentCount,
  });
}

function revalidateWorkspace() {
  revalidatePath("/dashboard");
  revalidatePath("/applications");
  revalidatePath("/resumes");
  revalidatePath("/cover-letters");
  revalidatePath("/profile");
}

function generationMetadata(claims: string[]) {
  return {
    generated_by: "maxwell",
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    unsupported_claims: claims,
    generated_at: new Date().toISOString(),
  };
}

async function resolveDocumentInput(
  threadId: string,
  input: z.infer<typeof documentInputSchema>,
) {
  let content = input.content?.trim() || null;
  let filePath: string | null = null;
  if (input.attachment_id) {
    const [attachment] = await getMaxwellAttachmentContext(threadId, [input.attachment_id]);
    if (!attachment) throw new Error("The selected attachment was not found.");
    filePath = attachment.file_path;
    content ||= attachment.extracted_text;
  }
  return { content, filePath };
}

async function searchWorkspace(args: z.infer<typeof schemas.search_workspace>) {
  const query = normalized(args.query);
  const include = (value: unknown) =>
    !query || JSON.stringify(value).toLocaleLowerCase().includes(query);
  const result: Record<string, unknown> = {};

  if (args.entity === "all" || args.entity === "applications") {
    result.applications = (await getApplications()).filter(include).slice(0, 20);
  }
  if (args.entity === "all" || args.entity === "documents") {
    const documents = await getDocumentLibraryData();
    result.documents = {
      masterResumes: documents.masterResumes.filter(include).slice(0, 10),
      tailoredResumes: documents.resumeVersions.filter(include).slice(0, 10),
      coverLetters: documents.coverLetters.filter(include).slice(0, 10),
    };
  }
  if (args.entity === "all" || args.entity === "profile") {
    const profile = await getCareerProfile();
    result.profile = include(profile) ? profile : { matched: false };
  }
  return result;
}

async function getApplicationTool(applicationId: string) {
  const application = await getApplicationById(applicationId);
  if (!application) throw new Error("Application not found.");
  const [resumeVersions, coverLetters] = await Promise.all([
    getResumeVersions(applicationId),
    getCoverLetters(applicationId),
  ]);
  return { application, resumeVersions, coverLetters };
}

async function getDocumentTool(args: z.infer<typeof schemas.get_document>) {
  if (args.kind === "master_resume") return getMasterResume(args.document_id);
  if (args.kind === "resume_version") return getTailoredResume(args.document_id);
  return getCoverLetter(args.document_id);
}

async function createApplicationPackage(
  args: z.infer<typeof schemas.create_application_package>,
  context: ToolExecutionContext,
) {
  const { supabase } = await getMaxwellAuthContext();

  const resume = args.resume
    ? { ...args.resume, ...(await resolveDocumentInput(context.threadId, args.resume)) }
    : undefined;
  const coverLetter = args.cover_letter
    ? {
        ...args.cover_letter,
        ...(await resolveDocumentInput(context.threadId, {
          ...args.cover_letter,
          base_resume_id: undefined,
        })),
      }
    : undefined;

  const payload = {
    company_name: args.company_name,
    role_title: args.role_title,
    job_description: args.job_description,
    job_url: args.job_url,
    location: args.location,
    status: args.mark_submitted && args.status === "saved" ? "applied" : args.status,
    date_applied: args.date_applied,
    deadline: args.deadline,
    notes: args.notes,
    referral_contact: args.referral_contact,
    next_action: args.next_action,
    mark_submitted: args.mark_submitted,
    allow_duplicate: args.allow_duplicate,
    resume: resume
      ? {
          title: resume.title,
          content: resume.content,
          content_format: resume.content_format,
          file_path: resume.filePath,
          base_resume_id: resume.base_resume_id,
          generation_metadata: generationMetadata(resume.unsupported_claims),
          rules_used: { unsupported_claims: resume.unsupported_claims },
        }
      : undefined,
    cover_letter: coverLetter
      ? {
          title: coverLetter.title,
          content: coverLetter.content,
          content_format: coverLetter.content_format,
          file_path: coverLetter.filePath,
          generation_metadata: generationMetadata(coverLetter.unsupported_claims),
          template_used: "Maxwell",
        }
      : undefined,
  };
  const { data, error } = await supabase.rpc("create_application_package", {
    p_package: asJson(payload),
  });
  if (error) throw error;
  revalidateWorkspace();
  const ids = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  if (ids.duplicate_found === true) {
    return {
      duplicate_found: true,
      existing_application_id: ids.existing_application_id,
      message: "A matching application already exists. Ask whether to update it or create a duplicate.",
    };
  }
  return { ...ids, duplicate_found: false, application_url: `/applications/${ids.application_id}` };
}

async function createDocument(
  args: z.infer<typeof schemas.create_document>,
  context: ToolExecutionContext,
) {
  const { supabase, userId } = await getMaxwellAuthContext();
  const resolved = await resolveDocumentInput(context.threadId, args.document);
  const metadata = generationMetadata(args.document.unsupported_claims);

  if (args.kind === "master_resume") {
    const countResult = await supabase
      .from("resumes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (countResult.error) throw countResult.error;
    const { data, error } = await supabase
      .from("resumes")
      .insert({
        user_id: userId,
        name: args.document.title,
        content: resolved.content,
        content_format: args.document.content_format,
        generation_metadata: metadata,
        file_path: resolved.filePath,
        is_default: (countResult.count ?? 0) === 0,
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidateWorkspace();
    return { document_id: data.id, document_url: `/resumes/${data.id}` };
  }

  if (!args.application_id) {
    throw new Error("An application is required for tailored documents.");
  }
  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("id, job_description")
    .eq("id", args.application_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (applicationError || !application) {
    throw applicationError ?? new Error("Application not found.");
  }

  if (args.kind === "resume_version") {
    let baseResumeId = args.document.base_resume_id ?? null;
    if (!baseResumeId) {
      const defaultResume = await supabase
        .from("resumes")
        .select("id")
        .eq("user_id", userId)
        .eq("is_default", true)
        .maybeSingle();
      if (defaultResume.error) throw defaultResume.error;
      baseResumeId = defaultResume.data?.id ?? null;
    }
    const { data, error } = await supabase
      .from("resume_versions")
      .insert({
        user_id: userId,
        application_id: application.id,
        base_resume_id: baseResumeId,
        title: args.document.title,
        content: resolved.content,
        content_format: args.document.content_format,
        generation_metadata: metadata,
        rules_used: { unsupported_claims: args.document.unsupported_claims },
        file_path: resolved.filePath,
        job_description_snapshot: application.job_description,
      })
      .select("*")
      .single();
    if (error) throw error;
    revalidateWorkspace();
    return { document_id: data.id, document_url: `/resumes/versions/${data.id}` };
  }

  const { data, error } = await supabase
    .from("cover_letters")
    .insert({
      user_id: userId,
      application_id: application.id,
      title: args.document.title,
      content: resolved.content,
      content_format: args.document.content_format,
      generation_metadata: metadata,
      template_used: "Maxwell",
      file_path: resolved.filePath,
      job_description_snapshot: application.job_description,
    })
    .select("*")
    .single();
  if (error) throw error;
  revalidateWorkspace();
  return { document_id: data.id, document_url: `/cover-letters/${data.id}` };
}

async function updateApplicationTool(args: z.infer<typeof schemas.update_application>) {
  const { supabase, userId } = await getMaxwellAuthContext();
  const id = args.application_id;
  const update: Database["public"]["Tables"]["applications"]["Update"] = {};
  if (args.company_name !== undefined) update.company_name = args.company_name;
  if (args.role_title !== undefined) update.role_title = args.role_title;
  if (args.job_url !== undefined) update.job_url = args.job_url || null;
  if (args.job_description !== undefined) update.job_description = args.job_description || null;
  if (args.location !== undefined) update.location = args.location || null;
  if (args.deadline !== undefined) update.deadline = args.deadline || null;
  if (args.date_applied !== undefined) update.date_applied = args.date_applied || null;
  if (args.notes !== undefined) update.notes = args.notes || null;
  if (args.referral_contact !== undefined) update.referral_contact = args.referral_contact || null;
  if (args.next_action !== undefined) update.next_action = args.next_action || null;
  if (!Object.keys(update).length) throw new Error("No application changes were provided.");
  const { data, error } = await supabase
    .from("applications")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  revalidateWorkspace();
  return { application_id: data.id, application_url: `/applications/${data.id}` };
}

async function moveApplication(args: z.infer<typeof schemas.move_application>) {
  const { supabase, userId } = await getMaxwellAuthContext();
  const positionResult = await supabase
    .from("applications")
    .select("position")
    .eq("user_id", userId)
    .eq("status", args.status)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (positionResult.error) throw positionResult.error;
  const { data, error } = await supabase
    .from("applications")
    .update({ status: args.status, position: (positionResult.data?.position ?? -1) + 1 })
    .eq("id", args.application_id)
    .eq("user_id", userId)
    .select("id, status")
    .single();
  if (error) throw error;
  revalidateWorkspace();
  return { application_id: data.id, status: data.status, application_url: `/applications/${data.id}` };
}

async function updateDocumentTool(args: z.infer<typeof schemas.update_document>) {
  const { supabase, userId } = await getMaxwellAuthContext();
  const metadata = args.unsupported_claims
    ? generationMetadata(args.unsupported_claims)
    : undefined;

  if (args.kind === "master_resume") {
    const update: Database["public"]["Tables"]["resumes"]["Update"] = {};
    if (args.title !== undefined) update.name = args.title;
    if (args.content !== undefined) update.content = args.content || null;
    if (args.content_format !== undefined) update.content_format = args.content_format;
    if (metadata) update.generation_metadata = metadata;
    const { data, error } = await supabase
      .from("resumes")
      .update(update)
      .eq("id", args.document_id)
      .eq("user_id", userId)
      .select("id")
      .single();
    if (error) throw error;
    revalidateWorkspace();
    return { document_id: data.id, document_url: `/resumes/${data.id}` };
  }

  if (args.kind === "resume_version") {
    const update: Database["public"]["Tables"]["resume_versions"]["Update"] = {};
    if (args.title !== undefined) update.title = args.title;
    if (args.content !== undefined) update.content = args.content || null;
    if (args.content_format !== undefined) update.content_format = args.content_format;
    if (metadata) {
      update.generation_metadata = metadata;
      update.rules_used = { unsupported_claims: args.unsupported_claims ?? [] };
    }
    const { data, error } = await supabase
      .from("resume_versions")
      .update(update)
      .eq("id", args.document_id)
      .eq("user_id", userId)
      .is("submitted_at", null)
      .select("id")
      .single();
    if (error) throw error;
    revalidateWorkspace();
    return { document_id: data.id, document_url: `/resumes/versions/${data.id}` };
  }

  const update: Database["public"]["Tables"]["cover_letters"]["Update"] = {};
  if (args.title !== undefined) update.title = args.title;
  if (args.content !== undefined) update.content = args.content || null;
  if (args.content_format !== undefined) update.content_format = args.content_format;
  if (metadata) update.generation_metadata = metadata;
  const { data, error } = await supabase
    .from("cover_letters")
    .update(update)
    .eq("id", args.document_id)
    .eq("user_id", userId)
    .is("submitted_at", null)
    .select("id")
    .single();
  if (error) throw error;
  revalidateWorkspace();
  return { document_id: data.id, document_url: `/cover-letters/${data.id}` };
}

async function updateProfileBasics(args: z.infer<typeof schemas.update_profile_basics>) {
  const { supabase, userId } = await getMaxwellAuthContext();
  const update: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if (args.full_name !== undefined) update.full_name = args.full_name.trim() || null;
  if (args.headline !== undefined) update.headline = args.headline.trim() || null;
  if (args.phone !== undefined) update.phone = args.phone.trim() || null;
  if (args.location !== undefined) update.location = args.location.trim() || null;
  if (args.summary !== undefined) update.summary = args.summary.trim() || null;
  if (args.additional_info !== undefined) update.additional_info = args.additional_info.trim() || null;
  if (!Object.keys(update).length) throw new Error("No profile changes were provided.");
  const { error } = await supabase.from("profiles").update(update).eq("id", userId);
  if (error) throw error;
  revalidateWorkspace();
  return { profile_url: "/profile" };
}

function textValue(item: Record<string, unknown>, key: string) {
  const value = item[key];
  return typeof value === "string" ? value.trim() : "";
}

function booleanValue(item: Record<string, unknown>, key: string) {
  return item[key] === true;
}

async function addProfileItem(args: z.infer<typeof schemas.add_profile_item>) {
  const { supabase, userId } = await getMaxwellAuthContext();
  const item = args.item;
  if (args.section === "skills") {
    const name = textValue(item, "name");
    if (!name) throw new Error("A skill name is required.");
    const { error } = await supabase.from("profile_skills").insert({ user_id: userId, name });
    if (error) throw error;
  } else if (args.section === "achievements") {
    const title = textValue(item, "title");
    if (!title) throw new Error("An achievement title is required.");
    const { error } = await supabase.from("profile_achievements").insert({
      user_id: userId,
      title,
      description: textValue(item, "description") || null,
      date: textValue(item, "date") || null,
    });
    if (error) throw error;
  } else if (args.section === "experience" || args.section === "volunteer") {
    const jobTitle = textValue(item, "job_title");
    const company = textValue(item, "company");
    if (!jobTitle || !company) throw new Error("Job title and company are required.");
    const { error } = await supabase.from("profile_experiences").insert({
      user_id: userId,
      kind: args.section === "experience" ? "work" : "volunteer",
      job_title: jobTitle,
      company,
      location: textValue(item, "location") || null,
      start_date: textValue(item, "start_date") || null,
      end_date: textValue(item, "end_date") || null,
      is_current: booleanValue(item, "is_current"),
      responsibilities: textValue(item, "responsibilities") || null,
    });
    if (error) throw error;
  } else if (args.section === "education") {
    const school = textValue(item, "school");
    if (!school) throw new Error("A school is required.");
    const { error } = await supabase.from("profile_education").insert({
      user_id: userId,
      school,
      degree: textValue(item, "degree") || null,
      field: textValue(item, "field") || null,
      location: textValue(item, "location") || null,
      start_date: textValue(item, "start_date") || null,
      end_date: textValue(item, "end_date") || null,
      is_current: booleanValue(item, "is_current"),
      details: textValue(item, "details") || null,
    });
    if (error) throw error;
  } else {
    const title = textValue(item, "title");
    if (!title) throw new Error("A project title is required.");
    const { error } = await supabase.from("profile_projects").insert({
      user_id: userId,
      title,
      date: textValue(item, "date") || null,
      url: textValue(item, "url") || null,
      description: textValue(item, "description") || null,
      tech_stack: textValue(item, "tech_stack") || null,
    });
    if (error) throw error;
  }
  revalidateWorkspace();
  return { profile_url: "/profile", section: args.section };
}

async function submitDocument(args: z.infer<typeof schemas.submit_document>) {
  if (args.kind === "resume_version") {
    const row = await markResumeVersionSubmitted(args.document_id);
    revalidateWorkspace();
    return { document_id: row.id, application_id: row.application_id, document_url: `/resumes/versions/${row.id}` };
  }
  const row = await markCoverLetterSubmitted(args.document_id);
  revalidateWorkspace();
  return { document_id: row.id, application_id: row.application_id, document_url: `/cover-letters/${row.id}` };
}

async function deleteRecord(args: z.infer<typeof schemas.delete_record>) {
  if (args.kind === "application") await deleteApplication(args.record_id);
  else if (args.kind === "master_resume") await deleteMasterResume(args.record_id);
  else if (args.kind === "resume_version") await deleteTailoredResume(args.record_id);
  else await deleteCoverLetter(args.record_id);
  revalidateWorkspace();
  return { deleted: true, kind: args.kind, record_id: args.record_id };
}

async function runParsedTool(
  name: ToolName,
  args: z.infer<(typeof schemas)[ToolName]>,
  context: ToolExecutionContext,
): Promise<Record<string, unknown>> {
  switch (name) {
    case "search_workspace":
      return searchWorkspace(args as z.infer<typeof schemas.search_workspace>);
    case "get_application":
      return getApplicationTool((args as z.infer<typeof schemas.get_application>).application_id);
    case "get_document": {
      const document = await getDocumentTool(args as z.infer<typeof schemas.get_document>);
      if (!document) throw new Error("Document not found.");
      return { document };
    }
    case "create_application_package":
      return createApplicationPackage(args as z.infer<typeof schemas.create_application_package>, context);
    case "create_document":
      return createDocument(args as z.infer<typeof schemas.create_document>, context);
    case "update_application":
      return updateApplicationTool(args as z.infer<typeof schemas.update_application>);
    case "move_application":
      return moveApplication(args as z.infer<typeof schemas.move_application>);
    case "update_document":
      return updateDocumentTool(args as z.infer<typeof schemas.update_document>);
    case "update_profile_basics":
      return updateProfileBasics(args as z.infer<typeof schemas.update_profile_basics>);
    case "add_profile_item":
      return addProfileItem(args as z.infer<typeof schemas.add_profile_item>);
    case "submit_document":
      return submitDocument(args as z.infer<typeof schemas.submit_document>);
    case "delete_record":
      return deleteRecord(args as z.infer<typeof schemas.delete_record>);
  }
}

export async function executeMaxwellToolCall(
  call: FunctionCall,
  context: ToolExecutionContext,
) {
  const name = call.name as ToolName | undefined;
  if (!name || !(name in schemas)) {
    return { error: `Unknown Maxwell tool: ${call.name ?? "unnamed"}.` };
  }
  const parsed = schemas[name].safeParse(call.args ?? {});
  if (!parsed.success) {
    return { error: "Invalid tool arguments.", details: parsed.error.flatten() };
  }

  if (READ_TOOLS.has(name)) {
    try {
      return await runParsedTool(name, parsed.data, context);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Tool failed." };
    }
  }

  const parsedArgs = parsed.data as { authorization_evidence?: string };
  const needsConfirmation = requiresConfirmation(name, parsedArgs, context);
  const action = await createMaxwellAction({
    threadId: context.threadId,
    messageId: context.assistantMessageId,
    toolName: name,
    arguments: asJson(parsed.data),
    status: needsConfirmation ? "pending" : "running",
    requiresConfirmation: needsConfirmation,
    authorizationEvidence: parsedArgs.authorization_evidence ?? null,
  });

  if (needsConfirmation) {
    await context.emit?.({ type: "action_pending", action });
    return {
      pending_confirmation: true,
      action_id: action.id,
      message: "The action is waiting for the user's confirmation.",
    };
  }

  await context.emit?.({ type: "action_started", actionId: action.id, toolName: name });
  try {
    const result = await runParsedTool(name, parsed.data, context);
    const completed = await updateMaxwellAction(action.id, {
      status: "succeeded",
      result: asJson(result),
    });
    await context.emit?.({ type: "action_result", action: completed });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool failed.";
    const failed = await updateMaxwellAction(action.id, { status: "failed", error: message });
    await context.emit?.({ type: "action_result", action: failed });
    return { error: message, action_id: action.id };
  }
}

export async function decideMaxwellAction(actionId: string, decision: "confirm" | "decline") {
  const { supabase, userId } = await getMaxwellAuthContext();
  const { data, error } = await supabase
    .from("assistant_actions")
    .update({ status: decision === "decline" ? "declined" : "running" })
    .eq("id", actionId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("This action is no longer awaiting confirmation.");

  if (decision === "decline") {
    return toAction(data);
  }

  const name = data.tool_name as ToolName;
  if (!(name in schemas) || READ_TOOLS.has(name)) throw new Error("Unsupported action.");
  const parsed = schemas[name].safeParse(data.arguments);
  if (!parsed.success) throw new Error("The saved action is invalid.");

  try {
    const result = await runParsedTool(name, parsed.data, {
      threadId: data.thread_id,
      assistantMessageId: data.message_id ?? "",
      currentUserMessage: data.authorization_evidence ?? "",
      attachmentCount: 0,
    });
    return updateMaxwellAction(actionId, { status: "succeeded", result: asJson(result) });
  } catch (toolError) {
    const message = toolError instanceof Error ? toolError.message : "Action failed.";
    return updateMaxwellAction(actionId, { status: "failed", error: message });
  }
}

export function maxwellActionFromRow(
  row: Database["public"]["Tables"]["assistant_actions"]["Row"],
) {
  return toAction(row);
}

export type MaxwellToolStatus = ApplicationStatus;
export type MaxwellToolFormat = DocumentContentFormat;
