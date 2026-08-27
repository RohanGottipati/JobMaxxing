import assert from "node:assert/strict";
import test from "node:test";

import { careerProfileFixture, resumeDocumentFixture } from "@/lib/test/fixtures";
import { createResumeRenderModel } from "@/lib/resumes/render-model";
import { scoreResume } from "./scoring";

test("resume scoring produces bounded explainable category deductions", () => {
  const profile = careerProfileFixture();
  const result = scoreResume(createResumeRenderModel(resumeDocumentFixture(), profile), profile);
  assert.ok(result.overallScore >= 0 && result.overallScore <= 100);
  assert.equal(result.reviews.perspectives.length, 6);
  for (const deduction of result.deductions) {
    assert.ok(deduction.location);
    assert.ok(deduction.why);
    assert.ok(deduction.points > 0);
    assert.ok(deduction.recommendedFix);
  }
});
