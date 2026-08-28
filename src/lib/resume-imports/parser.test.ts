import assert from "node:assert/strict";
import test from "node:test";

import { parseResumeDeterministically } from "./parser";
import { careerProfileFixture } from "../test/fixtures";

test("parses structured sections and retains duplicate candidates for review", () => {
  const text = `Ada Lovelace
ada@example.com | +1 416 555 0100

EXPERIENCE
Platform Engineer
Example Co
2022 - 2024
- Reduced API latency by 30%.

EDUCATION
University of Toronto
BASc, Computer Engineering

SKILLS
PostgreSQL, TypeScript`;
  const result = parseResumeDeterministically({ text, pages: [{ page: 1, text }], existing: careerProfileFixture() });

  const duplicate = result.duplicates.find((item) => item.kind === "experience");
  assert.ok(duplicate);
  assert.equal(duplicate.candidate.jobTitle, "Platform Engineer");
  assert.equal(duplicate.candidate.company, "Example Co");
  assert.equal(duplicate.candidate.bullets[0]?.approvedText, "Reduced API latency by 30%.");
  assert.equal(result.evidence[`experiences.${duplicate.importedId}`], undefined);
  assert.match(result.warnings.join(" "), /merge decision/i);
});
