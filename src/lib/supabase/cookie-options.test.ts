import assert from "node:assert/strict";
import test from "node:test";

import { resolveCookieDomain } from "@/lib/supabase/cookie-options";

test("shares the session across apex and www on the deployed domain", () => {
  assert.equal(
    resolveCookieDomain(undefined, "https://jobmaxxing.app"),
    "jobmaxxing.app",
  );
  assert.equal(
    resolveCookieDomain(undefined, "https://www.jobmaxxing.app"),
    "jobmaxxing.app",
  );
});

test("stays host-only for local development", () => {
  assert.equal(resolveCookieDomain(undefined, "http://localhost:3000"), undefined);
  assert.equal(resolveCookieDomain(undefined, "http://127.0.0.1:3000"), undefined);
  assert.equal(resolveCookieDomain(undefined, "https://app.localhost"), undefined);
});

test("prefers an explicit cookie domain override", () => {
  assert.equal(
    resolveCookieDomain(".jobmaxxing.app", "http://localhost:3000"),
    ".jobmaxxing.app",
  );
  assert.equal(resolveCookieDomain("  ", "https://jobmaxxing.app"), "jobmaxxing.app");
});

test("returns undefined when nothing usable is configured", () => {
  assert.equal(resolveCookieDomain(undefined, undefined), undefined);
  assert.equal(resolveCookieDomain(undefined, "not a url"), undefined);
});
