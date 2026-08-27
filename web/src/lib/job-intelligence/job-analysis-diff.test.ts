import assert from "node:assert/strict";
import test from "node:test";

import { diffJobStructuredData } from "@/lib/job-intelligence/job-analysis-diff";
import type { JobStructuredData } from "@/lib/job-intelligence/schemas";

const base: JobStructuredData = {
  company: "Example",
  roleTitle: "Engineer",
  seniority: "mid",
  location: "Toronto",
  workArrangement: "hybrid",
  responsibilities: ["Build APIs"],
  requiredSkills: ["TypeScript"],
  preferredSkills: [],
  yearsExperience: { min: 3, max: null },
  educationRequirements: [],
  workAuthorizationRequirements: [],
  compensation: { currency: "CAD", min: 120_000, max: 150_000, period: "year" },
  benefits: [],
  industry: "Software",
  roleCategory: "Backend",
  applicationDeadline: "",
  postingDate: "",
};

test("job re-analysis diff reports only changed top-level fields", () => {
  const next: JobStructuredData = {
    ...base,
    location: "Remote in Canada",
    requiredSkills: ["TypeScript", "PostgreSQL"],
    compensation: { ...base.compensation, max: 160_000 },
  };
  const diff = diffJobStructuredData(base, next);
  assert.deepEqual(diff.map((item) => item.field), ["location", "requiredSkills", "compensation"]);
  assert.equal(diff.find((item) => item.field === "location")?.before, "Toronto");
  assert.deepEqual(diff.find((item) => item.field === "requiredSkills")?.after, ["TypeScript", "PostgreSQL"]);
});
