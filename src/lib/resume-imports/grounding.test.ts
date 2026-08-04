import assert from "node:assert/strict";
import test from "node:test";

import { isGroundedAiField } from "./grounding";

test("accepts only values and evidence copied from source text", () => {
  const source = "Platform Engineer at Example Co. Reduced API latency by 30%.";
  assert.equal(isGroundedAiField(source, { value: "Example Co", sourceText: "at Example Co" }), true);
  assert.equal(isGroundedAiField(source, { value: "Reduced latency by 80%", sourceText: "Reduced API latency by 30%" }), false);
  assert.equal(isGroundedAiField(source, { value: "Example Co", sourceText: "Imaginary evidence" }), false);
});
