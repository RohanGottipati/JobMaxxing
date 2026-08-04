import { z } from "zod";

const shortText = z.string().trim().max(500);
const stringList = z.array(z.string().trim().min(1).max(500)).max(150);

export const jobStructuredDataSchema = z.object({
  company: shortText,
  roleTitle: shortText,
  seniority: z.enum(["intern", "entry", "mid", "senior", "staff", "principal", "manager", "director", "executive", "unknown"]),
  location: shortText,
  workArrangement: z.enum(["remote", "hybrid", "onsite", "unknown"]),
  responsibilities: stringList,
  requiredSkills: stringList,
  preferredSkills: stringList,
  yearsExperience: z.object({ min: z.number().int().min(0).max(50).nullable(), max: z.number().int().min(0).max(50).nullable() }),
  educationRequirements: stringList,
  workAuthorizationRequirements: stringList,
  compensation: z.object({ currency: z.string().trim().regex(/^[A-Z]{3}$/).nullable(), min: z.number().min(0).max(100_000_000).nullable(), max: z.number().min(0).max(100_000_000).nullable(), period: z.enum(["hour", "month", "year"]).nullable() }),
  benefits: stringList,
  industry: shortText,
  roleCategory: shortText,
  applicationDeadline: z.string().trim().max(40),
  postingDate: z.string().trim().max(40),
});

export type JobStructuredData = z.infer<typeof jobStructuredDataSchema>;

export const parsedJobSchema = z.object({
  data: jobStructuredDataSchema,
  fieldConfidence: z.record(z.string().max(100), z.number().min(0).max(1)),
  warnings: z.array(z.string().trim().min(1).max(500)).max(50),
});

export const jobAnalysisReviewSchema = z.object({
  data: jobStructuredDataSchema,
});

export const evidenceStrengthSchema = z.enum(["strong", "partial", "related", "none", "unverified"]);
export const evidenceMatrixRowSchema = z.object({
  id: z.string().min(1).max(160),
  requirement: z.string().min(1).max(1_000),
  requirementType: z.enum(["required_skill", "preferred_skill", "experience", "education", "location", "work_arrangement", "compensation", "work_authorization", "responsibility"]),
  candidateEvidence: z.array(z.string().min(1).max(2_000)).max(20),
  evidenceSource: z.array(z.object({ id: z.string().max(100), type: z.enum(["experience", "project", "education", "skill", "preference", "resume"]), label: z.string().max(300), verified: z.boolean() })).max(20),
  confidence: z.number().min(0).max(1),
  strength: evidenceStrengthSchema,
  missingEvidence: z.string().max(1_000),
  suggestedAction: z.string().max(1_000),
});

export const jobMatchResultSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  categoryScores: z.object({
    requiredSkillOverlap: z.number().int().min(0).max(100),
    preferredSkillOverlap: z.number().int().min(0).max(100),
    roleSimilarity: z.number().int().min(0).max(100),
    seniorityFit: z.number().int().min(0).max(100),
    experienceDomainFit: z.number().int().min(0).max(100),
    educationFit: z.number().int().min(0).max(100),
    locationFit: z.number().int().min(0).max(100),
    workArrangementFit: z.number().int().min(0).max(100),
    compensationFit: z.number().int().min(0).max(100),
    workAuthorizationFit: z.number().int().min(0).max(100),
  }),
  strongMatches: z.array(z.string().min(1).max(1_000)).max(50),
  partialMatches: z.array(z.string().min(1).max(1_000)).max(50),
  missingRequirements: z.array(z.string().min(1).max(1_000)).max(50),
  concerns: z.array(z.string().min(1).max(1_000)).max(50),
  evidenceMatrix: z.array(evidenceMatrixRowSchema).max(300),
  recommendedChanges: z.array(z.object({ id: z.string().min(1).max(160), priority: z.enum(["critical", "high", "medium", "low"]), recommendation: z.string().min(1).max(1_000), evidence: z.array(z.string().max(500)).max(20) })).max(50),
  applyReasonable: z.boolean(),
  rationale: z.string().min(1).max(2_000),
});

export type EvidenceMatrixRow = z.infer<typeof evidenceMatrixRowSchema>;
export type JobMatchResult = z.infer<typeof jobMatchResultSchema>;

const changeValueSchema = z.union([z.string().max(5_000), z.boolean(), z.array(z.string().max(100)).max(200)]);
export const tailoringChangeSchema = z.object({
  id: z.string().min(1).max(160),
  type: z.enum(["section_order", "bullet_order", "skill_order", "bullet_rewrite", "hide_bullet"]),
  targetId: z.string().min(1).max(200),
  label: z.string().min(1).max(500),
  reason: z.string().min(1).max(1_000),
  before: changeValueSchema,
  after: changeValueSchema,
  evidenceRequirementIds: z.array(z.string().max(160)).max(50),
  unsupportedClaims: z.array(z.string().max(500)).max(20),
  defaultSelected: z.boolean(),
  factsUsed: z.array(z.string().max(2_000)).max(30).optional(),
  skillsAdded: z.array(z.string().max(100)).max(30).optional(),
  metricsAdded: z.array(z.string().max(160)).max(30).optional(),
  confidence: z.number().min(0).max(1).optional(),
  model: z.string().max(200).nullable().optional(),
});
export const tailoringChangesSchema = z.array(tailoringChangeSchema).max(200);
export type TailoringChange = z.infer<typeof tailoringChangeSchema>;

export const tailoringRequestSchema = z.object({ applicationId: z.uuid(), sourceResumeId: z.uuid(), jobMatchId: z.uuid() });
export const tailoringApplySchema = z.object({ selectedChangeIds: z.array(z.string().min(1).max(160)).max(200), title: z.string().trim().min(1).max(200) });

export const coverLetterRequestSchema = z.object({
  applicationId: z.uuid(),
  kind: z.enum(["master", "tailored"]),
  resumeId: z.uuid(),
  tone: z.enum(["direct", "warm", "technical", "startup", "formal", "enthusiastic"]),
  maxWords: z.union([z.literal(150), z.literal(200), z.literal(300)]),
});

export const coverLetterTransformSchema = z.object({
  action: z.enum(["regenerate_paragraph", "shorten", "expand", "change_tone"]),
  paragraphIndex: z.number().int().min(0).max(9).optional(),
  tone: coverLetterRequestSchema.shape.tone.optional(),
  maxWords: coverLetterRequestSchema.shape.maxWords.optional(),
}).superRefine((value, context) => {
  if (value.action === "regenerate_paragraph" && value.paragraphIndex === undefined) {
    context.addIssue({ code: "custom", path: ["paragraphIndex"], message: "Choose a paragraph to regenerate." });
  }
  if (value.action === "change_tone" && value.tone === undefined) {
    context.addIssue({ code: "custom", path: ["tone"], message: "Choose a tone." });
  }
  if (["shorten", "expand"].includes(value.action) && value.maxWords === undefined) {
    context.addIssue({ code: "custom", path: ["maxWords"], message: "Choose a target length." });
  }
});
