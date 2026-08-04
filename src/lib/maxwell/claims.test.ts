import assert from "node:assert/strict";
import test from "node:test";

import { assertGeneratedDocumentSafe, assertNoStoredUnsupportedClaims, findUnsupportedMetrics } from "./claims";

test("detects metrics that are not grounded in scoped source data", () => {
  assert.deepEqual(findUnsupportedMetrics("Reduced latency by 80% and served 10,000 users.", ["Reduced latency by 30%."]), ["80%", "10,000 users"]);
  assert.deepEqual(findUnsupportedMetrics("Reduced latency by 30%.", ["Reduced latency by 30%."]), []);
});

test("refuses to persist disclosed or deterministic unsupported claims", () => {
  assert.throws(() => assertGeneratedDocumentSafe({ content: "Grew revenue by 90%.", unsupportedClaims: [], sources: ["Grew revenue steadily."] }), /was not saved/);
  assert.throws(() => assertGeneratedDocumentSafe({ content: "Led the team.", unsupportedClaims: ["Led a team of 12"], sources: [] }), /unsupported claims/);
  assert.doesNotThrow(() => assertGeneratedDocumentSafe({ content: "Improved latency by 30%.", unsupportedClaims: [], sources: ["Improved latency by 30%."] }));
});

test("blocks submission of legacy AI documents with unresolved claims", () => {
  assert.throws(() => assertNoStoredUnsupportedClaims({ unsupported_claims: ["Invented metric"] }), /before marking/);
  assert.doesNotThrow(() => assertNoStoredUnsupportedClaims({ unsupported_claims: [] }));
});
