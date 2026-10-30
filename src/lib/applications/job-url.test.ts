import assert from "node:assert/strict";
import test from "node:test";

import { normalizeJobUrl } from "./job-url";

test("keeps http and https job links", () => {
  assert.equal(normalizeJobUrl(" https://boards.greenhouse.io/acme/jobs/1 "), "https://boards.greenhouse.io/acme/jobs/1");
  assert.equal(normalizeJobUrl("http://example.com/job?id=2"), "http://example.com/job?id=2");
});

test("treats a bare host as https", () => {
  assert.equal(normalizeJobUrl("company.com/careers/role"), "https://company.com/careers/role");
  assert.equal(normalizeJobUrl("localhost:3000/jobs/1"), null);
});

test("drops empty values and non-web schemes", () => {
  assert.equal(normalizeJobUrl(""), null);
  assert.equal(normalizeJobUrl(null), null);
  assert.equal(normalizeJobUrl("javascript:alert(1)"), null);
  assert.equal(normalizeJobUrl("JavaScript:alert(document.cookie)"), null);
  assert.equal(normalizeJobUrl("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(normalizeJobUrl("ftp://example.com/file"), null);
});
