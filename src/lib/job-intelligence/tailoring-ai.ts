import { z } from "zod";

import { validateGroundedText } from "@/lib/ai/grounding";
import type { TailoringChange } from "@/lib/job-intelligence/schemas";

const generatedRewriteSchema = z.object({
  targetId: z.string().min(1).max(200),
  suggestedText: z.string().trim().min(1).max(2_000),
  explanation: z.string().trim().min(1).max(1_000),
  factsUsed: z.array(z.string().trim().min(1).max(2_000)).max(30),
  unsupportedClaims: z.array(z.string().trim().min(1).max(500)).max(20),
  skillsAdded: z.array(z.string().trim().min(1).max(100)).max(20),
  metricsAdded: z.array(z.string().trim().min(1).max(160)).max(20),
  confidence: z.number().min(0).max(1),
});

export const aiTailoringBatchSchema = z.object({
  rewrites: z.array(generatedRewriteSchema).max(30),
});

export type TailoringRewriteCandidate = {
  targetId: string;
  label: string;
  currentText: string;
  allowedFacts: string[];
  allowedSkills: string[];
  evidenceRequirementIds: string[];
};

export function mergeAiTailoringRewrites(input: {
  changes: TailoringChange[];
  candidates: TailoringRewriteCandidate[];
  generated: z.infer<typeof aiTailoringBatchSchema>;
  model: string;
}) {
  const candidateByTarget = new Map(input.candidates.map((candidate) => [candidate.targetId, candidate]));
  const seen = new Set<string>();
  if (input.generated.rewrites.some((rewrite) => !candidateByTarget.has(rewrite.targetId) || seen.has(rewrite.targetId) || !seen.add(rewrite.targetId))) {
    throw new Error("INVALID_TAILORING_TARGET");
  }

  const changes = [...input.changes];
  for (const rewrite of input.generated.rewrites) {
    const candidate = candidateByTarget.get(rewrite.targetId);
    if (!candidate || rewrite.suggestedText === candidate.currentText) continue;
    const allowedFactSet = new Set(candidate.allowedFacts.map(normalize));
    const invalidFacts = rewrite.factsUsed.filter((fact) => !allowedFactSet.has(normalize(fact)));
    const factsUsed = rewrite.factsUsed.filter((fact) => allowedFactSet.has(normalize(fact)));
    const grounding = validateGroundedText({
      text: rewrite.suggestedText,
      sources: candidate.allowedFacts,
      disclosedUnsupportedClaims: [
        ...rewrite.unsupportedClaims,
        ...invalidFacts.map((fact) => `Unsupported cited fact: ${fact}`),
      ],
      skillsAdded: rewrite.skillsAdded,
      metricsAdded: rewrite.metricsAdded,
      allowedSkills: candidate.allowedSkills,
    });
    const blocked = grounding.unsupportedClaims.length > 0;
    if (!blocked) {
      const deterministicIndex = changes.findIndex(
        (change) => change.type === "bullet_rewrite" && change.targetId === candidate.targetId,
      );
      if (deterministicIndex >= 0) changes.splice(deterministicIndex, 1);
    }
    changes.push({
      id: `ai-rewrite-${candidate.targetId.replace(/[^a-zA-Z0-9-]/g, "-")}`,
      type: "bullet_rewrite",
      targetId: candidate.targetId,
      label: candidate.label,
      reason: rewrite.explanation,
      before: candidate.currentText,
      after: rewrite.suggestedText,
      evidenceRequirementIds: candidate.evidenceRequirementIds,
      unsupportedClaims: grounding.unsupportedClaims,
      defaultSelected: !blocked && rewrite.confidence >= 0.65,
      factsUsed,
      skillsAdded: rewrite.skillsAdded,
      metricsAdded: rewrite.metricsAdded,
      confidence: rewrite.confidence,
      model: input.model,
    });
  }
  return changes;
}

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}
