import { z } from "zod";

import {
  careerProfileV1Schema,
  certificationSchema,
  educationSchema,
  experienceSchema,
  projectSchema,
} from "@/lib/career/schemas";
import { RESUME_TEMPLATE_IDS } from "@/lib/resumes/schema";

export const RESUME_IMPORT_MAX_BYTES = 10 * 1024 * 1024;
export const RESUME_IMPORT_MAX_TEXT = 100_000;
export const RESUME_IMPORT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const createResumeImportSchema = z.discriminatedUnion("sourceKind", [
  z.object({
    sourceKind: z.literal("upload"),
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.enum(RESUME_IMPORT_MIME_TYPES),
    sizeBytes: z.number().int().min(1).max(RESUME_IMPORT_MAX_BYTES),
  }),
  z.object({
    sourceKind: z.literal("paste"),
    text: z.string().trim().min(50).max(RESUME_IMPORT_MAX_TEXT),
  }),
]);

export const resumeImportResultSchema = z.object({
  schemaVersion: z.literal(1),
  profile: careerProfileV1Schema,
  evidence: z.record(z.string(), z.object({
    confidence: z.number().min(0).max(1),
    sourceText: z.string().max(2_000),
    page: z.number().int().positive().nullable(),
  })),
  uncertainPaths: z.array(z.string()).max(500),
  duplicates: z.array(z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("experience"), importedId: z.uuid(), existingId: z.uuid(), label: z.string().max(500), candidate: experienceSchema }),
    z.object({ kind: z.literal("education"), importedId: z.uuid(), existingId: z.uuid(), label: z.string().max(500), candidate: educationSchema }),
    z.object({ kind: z.literal("project"), importedId: z.uuid(), existingId: z.uuid(), label: z.string().max(500), candidate: projectSchema }),
    z.object({ kind: z.literal("certification"), importedId: z.uuid(), existingId: z.uuid(), label: z.string().max(500), candidate: certificationSchema }),
  ])).max(100),
  warnings: z.array(z.string().max(1_000)).max(100),
});

export const duplicateDecisionSchema = z.enum(["keep_existing", "merge", "create_separate"]);
export const duplicateDecisionsSchema = z.record(z.uuid(), duplicateDecisionSchema);
export const resumeImportReviewSchema = z.object({
  schemaVersion: z.literal(1),
  profile: careerProfileV1Schema,
  duplicateDecisions: duplicateDecisionsSchema,
  resumeName: z.string().trim().min(1).max(160),
  templateId: z.enum(RESUME_TEMPLATE_IDS),
});

export type ResumeImportResult = z.infer<typeof resumeImportResultSchema>;
export type DuplicateDecision = z.infer<typeof duplicateDecisionSchema>;
export type DuplicateDecisions = z.infer<typeof duplicateDecisionsSchema>;
