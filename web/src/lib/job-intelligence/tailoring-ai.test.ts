import assert from "node:assert/strict";
import test from "node:test";

import { mergeAiTailoringRewrites } from "@/lib/job-intelligence/tailoring-ai";
import type { TailoringChange } from "@/lib/job-intelligence/schemas";

const deterministic: TailoringChange = {
  id: "rewrite-entry-bullet",
  type: "bullet_rewrite",
  targetId: "entry:bullet",
  label: "Tighten a relevant bullet",
  reason: "Safe fallback",
  before: "Built the API.",
  after: "Built the API.",
  evidenceRequirementIds: ["requirement"],
  unsupportedClaims: [],
  defaultSelected: true,
};
const candidate = {
  targetId: "entry:bullet",
  label: "Tailor a verified bullet",
  currentText: "Built the API.",
  allowedFacts: ["Built the API.", "TypeScript"],
  allowedSkills: ["TypeScript"],
  evidenceRequirementIds: ["requirement"],
};

test("safe batch rewrites replace the deterministic rewrite for the same target", () => {
  const changes = mergeAiTailoringRewrites({
    changes: [deterministic],
    candidates: [candidate],
    model: "test-model",
    generated: { rewrites: [{
      targetId: candidate.targetId,
      suggestedText: "Built the API with TypeScript.",
      explanation: "Makes the verified technology explicit.",
      factsUsed: candidate.allowedFacts,
      unsupportedClaims: [],
      skillsAdded: ["TypeScript"],
      metricsAdded: [],
      confidence: 0.9,
    }] },
  });
  assert.equal(changes.length, 1);
  assert.equal(changes[0].model, "test-model");
  assert.equal(changes[0].defaultSelected, true);
  assert.deepEqual(changes[0].unsupportedClaims, []);
});

test("unsupported batch rewrites remain visible, blocked, and unselected", () => {
  const changes = mergeAiTailoringRewrites({
    changes: [deterministic],
    candidates: [candidate],
    model: "test-model",
    generated: { rewrites: [{
      targetId: candidate.targetId,
      suggestedText: "Built the API and reduced latency by 80%.",
      explanation: "Adds impact.",
      factsUsed: ["Reduced latency by 80%."],
      unsupportedClaims: [],
      skillsAdded: [],
      metricsAdded: ["80%"],
      confidence: 0.95,
    }] },
  });
  assert.equal(changes.length, 2);
  assert.equal(changes[1].defaultSelected, false);
  assert.ok(changes[1].unsupportedClaims.some((claim) => /80%|cited fact/i.test(claim)));
});
