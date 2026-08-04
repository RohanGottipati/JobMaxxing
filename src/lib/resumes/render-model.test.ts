import assert from "node:assert/strict";
import test from "node:test";

import { createResumeRenderModel, formatDate } from "./render-model";
import { careerProfileFixture, resumeDocumentFixture } from "../test/fixtures";

test("creates the shared render model with date and link formatting", () => {
  const document = resumeDocumentFixture();
  document.presentation.dateFormat = "long";
  document.presentation.linkFormat = "label_and_url";
  const model = createResumeRenderModel(document, careerProfileFixture());
  const experience = model.sections.find((section) => section.type === "experience");

  assert.equal(model.name, "Ada Lovelace");
  assert.deepEqual(model.contactText, ["ada@example.com", "+1 416 555 0100", "Toronto, ON"]);
  assert.equal(model.links[0]?.label, "GitHub: github.com/ada");
  assert.equal(experience?.entries[0]?.date, "January 2022 – June 2024");
  assert.deepEqual(experience?.entries[0]?.bullets, ["Reduced API latency by 30%."]);
});

test("keeps invalid and free-form dates readable", () => {
  assert.equal(formatDate("2024-13", "long"), "2024-13");
  assert.equal(formatDate("Spring 2024", "short"), "Spring 2024");
  assert.equal(formatDate("2024-02", "numeric"), "2024-02");
});
