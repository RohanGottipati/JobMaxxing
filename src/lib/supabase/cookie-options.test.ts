import assert from "node:assert/strict";
import test from "node:test";

import { resolveCookieDomain } from "@/lib/supabase/cookie-options";

test("shares the session across apex and www on the deployed domain", () => {
  assert.equal(
    resolveCookieDomain(undefined, "https://job-maxxing.vercel.app"),
    "job-maxxing.vercel.app",
  );
  assert.equal(
    resolveCookieDomain(undefined, "https://www.job-maxxing.vercel.app"),
    "job-maxxing.vercel.app",
  );
});

test("stays host-only for local development", () => {
  assert.equal(resolveCookieDomain(undefined, "http://localhost:3000"), undefined);
  assert.equal(resolveCookieDomain(undefined, "http://127.0.0.1:3000"), undefined);
  assert.equal(resolveCookieDomain(undefined, "https://app.localhost"), undefined);
});

test("prefers an explicit cookie domain override", () => {
  assert.equal(
    resolveCookieDomain(".job-maxxing.vercel.app", "http://localhost:3000"),
    ".job-maxxing.vercel.app",
  );
  assert.equal(
    resolveCookieDomain("  ", "https://job-maxxing.vercel.app"),
    "job-maxxing.vercel.app",
  );
});

test("returns undefined when nothing usable is configured", () => {
  assert.equal(resolveCookieDomain(undefined, undefined), undefined);
  assert.equal(resolveCookieDomain(undefined, "not a url"), undefined);
});
