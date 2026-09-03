import assert from "node:assert/strict";
import test from "node:test";

import { parseMarkdownBlocks, parseMarkdownSpans } from "@/lib/previews/markdown";

test("treats HTML as literal text instead of markup", () => {
  const spans = parseMarkdownSpans('Hello <script>alert(1)</script> **world**');
  assert.deepEqual(
    spans.map((span) => span.type),
    ["text", "strong"],
  );
  assert.equal(spans[0]?.type === "text" ? spans[0].text : "", "Hello <script>alert(1)</script> ");
});

test("only allows http(s) and mailto links", () => {
  const blocks = parseMarkdownBlocks("[safe](https://example.com) and [bad](javascript:alert(1))");
  const paragraph = blocks[0];
  assert.equal(paragraph?.type, "paragraph");
  if (paragraph?.type !== "paragraph") return;
  assert.equal(paragraph.spans.some((span) => span.type === "link" && span.href.startsWith("https:")), true);
  assert.equal(paragraph.spans.some((span) => span.type === "link" && span.href.startsWith("javascript:")), false);
});
