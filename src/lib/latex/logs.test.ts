import assert from "node:assert/strict";
import test from "node:test";

import { parseLatexLog, summarizeLatexLog } from "@/lib/latex/logs";

test("pairs TeX error messages with later line markers", () => {
  const entries = parseLatexLog(`
! Undefined control sequence.
l.12 \\unknwn
LaTeX Warning: Unused global option(s) on input line 4.
Overfull \\hbox (12.0pt too wide) at lines 20--21
`);
  assert.equal(entries[0]?.severity, "error");
  assert.equal(entries[0]?.line, 12);
  assert.match(entries[0]?.message ?? "", /Undefined control sequence/);
  assert.equal(entries[1]?.severity, "warning");
  assert.equal(entries[1]?.line, 4);
  assert.equal(summarizeLatexLog(entries).errors, 1);
});
