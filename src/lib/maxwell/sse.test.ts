import assert from "node:assert/strict";
import test from "node:test";

import { parseMaxwellSseBuffer } from "./sse";

test("parses complete SSE events and retains a partial chunk", () => {
  const parsed = parseMaxwellSseBuffer(
    'data: {"type":"message_delta","delta":"Hello"}\n\n' +
      'data: {"type":"message_delta","delta":" wor',
  );
  assert.deepEqual(parsed.events, [
    { type: "message_delta", delta: "Hello" },
  ]);
  assert.equal(
    parsed.remainder,
    'data: {"type":"message_delta","delta":" wor',
  );
});

test("accepts CRLF framing and multiple data lines", () => {
  const parsed = parseMaxwellSseBuffer(
    'event: message\r\ndata: {"type":"error",\r\ndata: "message":"Try again"}\r\n\r\n',
  );
  assert.deepEqual(parsed.events, [{ type: "error", message: "Try again" }]);
  assert.equal(parsed.remainder, "");
});
