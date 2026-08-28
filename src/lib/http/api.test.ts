import assert from "node:assert/strict";
import test from "node:test";

import { routeError } from "./api";

test("maps Supabase validation and authorization objects without leaking details", async () => {
  const validation = routeError({
    code: "23503",
    message: "foreign key violation containing private row identifiers",
  });
  assert.equal(validation.status, 422);
  assert.deepEqual(await validation.json(), {
    error: {
      code: "VALIDATION",
      message: "The request contains an invalid or mismatched value.",
    },
  });

  const forbidden = routeError({ code: "42501", message: "row-level security" });
  assert.equal(forbidden.status, 403);
});

test("returns a structured rate-limit response", async () => {
  const response = routeError(
    new Error("AI_RATE_LIMITED:2026-08-04T12:00:00.000Z"),
  );
  assert.equal(response.status, 429);
  const body = await response.json();
  assert.equal(body.error.code, "RATE_LIMITED");
  assert.match(body.error.resetAt, /^2026-08-04/);
});

test("maps safe job-import failures without exposing network details", async () => {
  const unsupported = routeError(new Error("JOB_URL_UNSUPPORTED:127.0.0.1"));
  assert.equal(unsupported.status, 422);
  assert.deepEqual(await unsupported.json(), {
    error: {
      code: "VALIDATION",
      message: "Enter a supported HTTPS job URL from Greenhouse, Lever, Ashby, Workday, iCIMS, Workable, SmartRecruiters, LinkedIn, or Indeed.",
    },
  });

  const unavailable = routeError(new Error("JOB_IMPORT_UNAVAILABLE:provider stack"));
  assert.equal(unavailable.status, 503);
  const body = await unavailable.json();
  assert.equal(body.error.code, "UNAVAILABLE");
  assert.doesNotMatch(body.error.message, /provider stack/);
});
