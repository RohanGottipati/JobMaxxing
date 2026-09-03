import assert from "node:assert/strict";
import test from "node:test";

import { isCompiledOutputFresh } from "@/lib/latex/compile-freshness";

test("compiled output is fresh only when versions match", () => {
  assert.equal(isCompiledOutputFresh({ compiledRowVersion: 4, rowVersion: 4 }), true);
  assert.equal(isCompiledOutputFresh({ compiledRowVersion: 3, rowVersion: 4 }), false);
  assert.equal(isCompiledOutputFresh({ compiledRowVersion: null, rowVersion: 1 }), false);
});
