import assert from "node:assert/strict";
import test from "node:test";

import { resolveLatexCreateSource } from "@/lib/latex/create";

test("pasted source replaces the starter template", () => {
  const resolved = resolveLatexCreateSource({
    kind: "master_resume",
    templateId: "ats-resume",
    pastedSource: "\\documentclass{article}\\begin{document}Custom\\end{document}",
  });
  assert.match(resolved.source, /Custom/);
  assert.equal(resolved.templateId, null);
});

test("rejects a cover-letter template for a resume", () => {
  assert.throws(() =>
    resolveLatexCreateSource({
      kind: "master_resume",
      templateId: "cover-letter",
      pastedSource: null,
    }),
  );
});
