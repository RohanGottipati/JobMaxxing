import assert from "node:assert/strict";
import test from "node:test";

import { defaultLatexTemplateId, getLatexTemplate, latexTemplatesForKind } from "@/lib/latex/templates";

test("ATS resume template is a single-column article with parser-friendly headings", () => {
  const template = getLatexTemplate("ats-resume");
  assert.equal(template.engine, "pdflatex");
  assert.match(template.source, /\\documentclass\[11pt,letterpaper\]\{article\}/);
  assert.match(template.source, /\\section\{Experience\}/);
  assert.doesNotMatch(template.source, /tabular|tikzpicture|multicol/);
  assert.ok(template.kinds.includes("master_resume"));
  assert.ok(!template.kinds.includes("cover_letter"));
});

test("cover letter and blank templates are available for the expected kinds", () => {
  assert.equal(defaultLatexTemplateId("cover_letter"), "cover-letter");
  assert.equal(defaultLatexTemplateId("master_resume"), "ats-resume");
  assert.deepEqual(
    latexTemplatesForKind("cover_letter").map((template) => template.id),
    ["cover-letter", "blank"],
  );
});
