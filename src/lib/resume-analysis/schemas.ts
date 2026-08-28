import { z } from "zod";

export const RESUME_SCORE_CATEGORIES = [
  "atsReadability",
  "contentQuality",
  "writingQuality",
  "jobRelevance",
  "applicationReadiness",
  "contactCompleteness",
  "formatting",
  "impact",
  "quantification",
  "actionVerbs",
  "brevity",
  "technicalDepth",
  "leadershipEvidence",
  "consistency",
  "dateConsistency",
  "sectionCompleteness",
] as const;

export const resumeScoreCategorySchema = z.enum(RESUME_SCORE_CATEGORIES);
export type ResumeScoreCategory = z.infer<typeof resumeScoreCategorySchema>;

export const scoreDeductionSchema = z.object({
  id: z.string().min(1).max(120),
  category: resumeScoreCategorySchema,
  problem: z.string().min(1).max(500),
  location: z.string().min(1).max(300),
  why: z.string().min(1).max(800),
  points: z.number().int().min(1).max(30),
  recommendedFix: z.string().min(1).max(800),
  action: z.object({
    type: z.enum(["navigate", "edit", "none"]),
    label: z.string().min(1).max(120),
    href: z.string().max(500).nullable(),
  }),
});

export const reviewFindingSchema = z.object({
  priority: z.enum(["critical", "high", "optional", "strength"]),
  title: z.string().min(1).max(240),
  detail: z.string().min(1).max(1_200),
  location: z.string().max(300),
});

export const reviewerPerspectiveSchema = z.object({
  reviewer: z.enum(["ats", "technical_recruiter", "hiring_manager", "senior_engineer", "startup_recruiter", "nontechnical_recruiter"]),
  label: z.string().min(1).max(80),
  focus: z.string().min(1).max(240),
  score: z.number().int().min(0).max(100),
  findings: z.array(reviewFindingSchema).max(12),
});

export const multiPerspectiveReviewSchema = z.object({
  perspectives: z.array(reviewerPerspectiveSchema).length(6),
  criticalFixes: z.array(z.string().min(1).max(500)).max(12),
  highImpactImprovements: z.array(z.string().min(1).max(500)).max(16),
  optionalImprovements: z.array(z.string().min(1).max(500)).max(16),
  strengths: z.array(z.string().min(1).max(500)).max(16),
  credibilityConcerns: z.array(z.string().min(1).max(500)).max(12),
  missingEvidence: z.array(z.string().min(1).max(500)).max(16),
  roleSpecificConcerns: z.array(z.string().min(1).max(500)).max(12),
});

export const resumeAnalysisResultSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  categoryScores: z.object(Object.fromEntries(RESUME_SCORE_CATEGORIES.map((category) => [category, z.number().int().min(0).max(100)])) as Record<(typeof RESUME_SCORE_CATEGORIES)[number], z.ZodNumber>),
  deductions: z.array(scoreDeductionSchema).max(100),
  strengths: z.array(z.string().min(1).max(500)).max(30),
  reviews: multiPerspectiveReviewSchema,
  analysisKind: z.enum(["deterministic", "combined"]),
  model: z.string().nullable(),
});

export type ResumeAnalysisResult = z.infer<typeof resumeAnalysisResultSchema>;

export const semanticResumeReviewSchema = z.object({
  adjustments: z.object({
    contentQuality: z.number().int().min(-10).max(5),
    writingQuality: z.number().int().min(-10).max(5),
    impact: z.number().int().min(-10).max(5),
    technicalDepth: z.number().int().min(-10).max(5),
    leadershipEvidence: z.number().int().min(-10).max(5),
    consistency: z.number().int().min(-10).max(5),
  }),
  reviews: multiPerspectiveReviewSchema,
});
