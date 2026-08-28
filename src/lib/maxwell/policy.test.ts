import assert from "node:assert/strict";
import test from "node:test";

import {
  hasExplicitWriteAuthorization,
  shouldConfirmMaxwellWrite,
} from "./policy";

test("accepts an exact current-message quote with explicit write intent", () => {
  assert.equal(
    hasExplicitWriteAuthorization(
      "Please create and save this cover letter.",
      "create and save this cover letter",
    ),
    true,
  );
});

test("rejects generic substrings and quotes from older context", () => {
  assert.equal(hasExplicitWriteAuthorization("Tell me how it fits", "me"), false);
  assert.equal(
    hasExplicitWriteAuthorization("What would you change?", "save this version"),
    false,
  );
});

test("always confirms deletes", () => {
  assert.equal(
    shouldConfirmMaxwellWrite({
      name: "delete_record",
      currentMessage: "Delete this cover letter",
      evidence: "Delete this cover letter",
      attachmentCount: 0,
    }),
    true,
  );
});

test("allows an attachment-only package import and confirms ambiguous writes", () => {
  assert.equal(
    shouldConfirmMaxwellWrite({
      name: "create_application_package",
      currentMessage: "",
      attachmentCount: 3,
    }),
    false,
  );
  assert.equal(
    shouldConfirmMaxwellWrite({
      name: "update_document",
      currentMessage: "Does this resume fit the job?",
      evidence: "this resume",
      attachmentCount: 0,
    }),
    true,
  );
});
