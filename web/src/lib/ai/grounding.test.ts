import assert from "node:assert/strict";
import test from "node:test";

import { assertGroundedText, validateGroundedText } from "./grounding";

test("flags metrics and skills that are absent from the evidence corpus", () => {
  const result = validateGroundedText({
    text: "Improved latency by 40% using Kubernetes.",
    sources: ["Improved latency by 20% using Docker."],
    skillsAdded: ["Kubernetes"],
    metricsAdded: ["40%"],
    allowedSkills: ["Docker"],
  });
  assert.deepEqual(result.unsupportedClaims.sort(), ["Unsupported metric: 40%", "Unsupported skill: Kubernetes"]);
});

test("allows exact supported metrics and canonical skills", () => {
  assert.doesNotThrow(() => assertGroundedText({
    text: "Improved latency by 20% using Docker.",
    sources: ["Improved latency by 20% using Docker."],
    skillsAdded: ["Docker"],
    metricsAdded: ["20%"],
    allowedSkills: ["Docker"],
  }));
});

test("flags novel factual wording even when a model omits it from its disclosure", () => {
  const result = validateGroundedText({
    text: "Improved reliability for enterprise clusters.",
    sources: ["Improved reliability for the service."],
  });
  assert.deepEqual(result.unsupportedClaims.sort(), [
    "Unsupported factual wording: clusters",
    "Unsupported factual wording: enterprise",
  ]);
});
