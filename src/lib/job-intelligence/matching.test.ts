import assert from "node:assert/strict";
import test from "node:test";

import { calculateJobMatch } from "./matching";
import { careerProfileFixture, resumeDocumentFixture } from "@/lib/test/fixtures";
import { createResumeRenderModel } from "@/lib/resumes/render-model";

test("job matching distinguishes verified and missing requirements with evidence", () => {
  const profile = careerProfileFixture();
  const result = calculateJobMatch({
    company: "Example", roleTitle: "Platform Engineer", seniority: "mid", location: "Toronto", workArrangement: "hybrid", responsibilities: ["Build reliable APIs"], requiredSkills: ["PostgreSQL", "Kubernetes"], preferredSkills: ["Docker"], yearsExperience: { min: 2, max: null }, educationRequirements: [], workAuthorizationRequirements: [], compensation: { currency: null, min: null, max: null, period: null }, benefits: [], industry: "Technology", roleCategory: "Platform / DevOps", applicationDeadline: "", postingDate: "",
  }, profile, createResumeRenderModel(resumeDocumentFixture(), profile));
  assert.ok(result.overallScore >= 0 && result.overallScore <= 100);
  assert.equal(result.evidenceMatrix.find((row) => row.requirement === "PostgreSQL")?.strength, "strong");
  assert.equal(result.evidenceMatrix.find((row) => row.requirement === "Kubernetes")?.strength, "none");
  assert.ok(result.missingRequirements.includes("Kubernetes"));
});
