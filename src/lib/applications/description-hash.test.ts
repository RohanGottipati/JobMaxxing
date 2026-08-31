import assert from "node:assert/strict";
import test from "node:test";

import { hashJobDescription, normalizeJobDescription } from "./description-hash";

test("normalizeJobDescription collapses whitespace and lowercases", () => {
  assert.equal(
    normalizeJobDescription("  Senior   Engineer \n"),
    "senior engineer",
  );
});

test("hashJobDescription is stable for equivalent text", () => {
  const a = hashJobDescription("Senior  Engineer\n\nBuild APIs.");
  const b = hashJobDescription("senior engineer build apis.");
  assert.equal(a, b);
});

test("hashJobDescription returns null for empty text", () => {
  assert.equal(hashJobDescription("   "), null);
});
