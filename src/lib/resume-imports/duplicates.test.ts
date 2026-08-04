import assert from "node:assert/strict";
import test from "node:test";

import { applyDuplicateDecisions } from "./duplicates";
import { parseResumeDeterministically } from "./parser";
import { careerProfileFixture } from "../test/fixtures";

test("merges only missing duplicate details and preserves verified facts", () => {
  const existing = careerProfileFixture();
  existing.experiences[0].location = "";
  const text = `EXPERIENCE
Platform Engineer
Example Co
2022 - 2024
- Added a second supported bullet.`;
  const parsed = parseResumeDeterministically({ text, pages: [{ page: 1, text }], existing });
  const duplicate = parsed.duplicates.find((item) => item.kind === "experience");
  assert.ok(duplicate);
  duplicate.candidate.location = "Toronto";

  const merged = applyDuplicateDecisions(parsed.profile, parsed.duplicates, { [duplicate.importedId]: "merge" });
  assert.equal(merged.experiences.length, 1);
  assert.equal(merged.experiences[0].verificationStatus, "user_confirmed");
  assert.equal(merged.experiences[0].location, "Toronto");
  assert.equal(merged.experiences[0].bullets.length, 2);

  const separate = applyDuplicateDecisions(parsed.profile, parsed.duplicates, { [duplicate.importedId]: "create_separate" });
  assert.equal(separate.experiences.length, 2);
});
