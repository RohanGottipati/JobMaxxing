import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

import { sanitizeDocumentHtml } from "@/lib/previews/sanitize-html";

test("strips executable and remote-loading markup from converted DOCX", () => {
  const { window } = new JSDOM("<!doctype html><html><body></body></html>");
  const cleaned = sanitizeDocumentHtml(
    `<p>Hello</p><img src="x" onerror="alert(1)" /><script>alert(1)</script><a href="javascript:alert(1)">bad</a><a href="https://example.com">ok</a>`,
    window,
  );
  assert.match(cleaned, /Hello/);
  assert.match(cleaned, />ok</);
  assert.doesNotMatch(cleaned, /script|onerror|javascript:|<img/i);
  assert.match(cleaned, /https:\/\/example.com/);
  assert.match(cleaned, /noopener noreferrer nofollow/);
});
