import { z } from "zod";

export const BULLET_REWRITE_MODES = [
  "clarity", "concise", "technical_detail", "impact", "leadership", "collaboration", "ownership", "tailor_to_job", "action_verbs", "remove_repetition", "one_line", "accomplishment", "technical_recruiter", "nontechnical_recruiter",
] as const;

export const bulletRewriteModeSchema = z.enum(BULLET_REWRITE_MODES);
export const bulletSuggestionRequestSchema = z.object({
  kind: z.enum(["master", "tailored"]),
  resumeId: z.uuid(),
  bulletId: z.uuid(),
  mode: bulletRewriteModeSchema,
  applicationId: z.uuid().nullable().optional(),
});

export const aiBulletSuggestionSchema = z.object({
  suggestedText: z.string().trim().min(1).max(2_000),
  explanation: z.string().trim().min(1).max(1_000),
  factsUsed: z.array(z.string().trim().min(1).max(500)).max(20),
  unsupportedClaims: z.array(z.string().trim().min(1).max(500)).max(20),
  skillsAdded: z.array(z.string().trim().min(1).max(100)).max(20),
  metricsAdded: z.array(z.string().trim().min(1).max(100)).max(20),
  confidence: z.number().min(0).max(1),
});

export const bulletSuggestionDecisionSchema = z.object({
  decision: z.enum(["accepted", "rejected"]),
  editedText: z.string().trim().min(1).max(2_000).optional(),
});
