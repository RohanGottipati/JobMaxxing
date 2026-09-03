import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_DOCUMENT_FILE_SIZE,
  documentContentType,
  isOwnedApplicationPackagePath,
  safeDocumentFileName,
  validateDocumentFile,
} from "@/lib/documents/upload-policy";

test("accepts PDF and DOCX application package files", () => {
  assert.equal(
    documentContentType({ name: "submitted-resume.pdf", type: "application/pdf" }),
    "application/pdf",
  );
  assert.equal(
    documentContentType({ name: "cover-letter.docx", type: "" }),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
});

test("rejects mismatched, empty, and oversized document files", () => {
  const mismatched = validateDocumentFile({
    name: "resume.pdf",
    type: "text/plain",
    size: 100,
  });
  const empty = validateDocumentFile({
    name: "resume.pdf",
    type: "application/pdf",
    size: 0,
  });
  const oversized = validateDocumentFile({
    name: "resume.pdf",
    type: "application/pdf",
    size: MAX_DOCUMENT_FILE_SIZE + 1,
  });

  assert.ok(mismatched);
  assert.ok(empty);
  assert.ok(oversized);
  assert.match(mismatched, /PDF or DOCX/);
  assert.match(empty, /empty/);
  assert.match(oversized, /10 MB/);
});

test("sanitizes uploaded document names without losing their extension", () => {
  assert.equal(safeDocumentFileName("Rohan's Resume (final).pdf"), "Rohan-s-Resume-final.pdf");
  assert.equal(safeDocumentFileName("../../"), "document");
});

test("accepts only application-package objects owned by the current user", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  assert.equal(
    isOwnedApplicationPackagePath(
      `${userId}/application-packages/random-resume.pdf`,
      userId,
    ),
    true,
  );
  assert.equal(
    isOwnedApplicationPackagePath(
      "22222222-2222-4222-8222-222222222222/application-packages/random-resume.pdf",
      userId,
    ),
    false,
  );
  assert.equal(
    isOwnedApplicationPackagePath(
      `${userId}/application-packages/../master-resumes/resume.pdf`,
      userId,
    ),
    false,
  );
});
