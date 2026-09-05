import assert from "node:assert/strict";
import test from "node:test";

import {
  ByteLimitExceededError,
  readBoundedBytes,
} from "@/lib/http/read-bounded-bytes";

test("reads a stream up to its byte limit", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(Uint8Array.from([1, 2]));
      controller.enqueue(Uint8Array.from([3]));
      controller.close();
    },
  });

  assert.deepEqual(await readBoundedBytes(stream, 3), Uint8Array.from([1, 2, 3]));
});

test("preserves the byte-limit error when stream cancellation fails", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(Uint8Array.from([1, 2]));
    },
    cancel() {
      throw new Error("cancel failed");
    },
  });

  await assert.rejects(
    () => readBoundedBytes(stream, 1),
    ByteLimitExceededError,
  );
});
