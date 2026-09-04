import assert from "node:assert/strict";
import test from "node:test";

import { defaultPreviewView, selectPreviewViews } from "@/lib/previews/select-view";
import type { DocumentPreviewDescriptor } from "@/lib/previews/types";

const descriptor = {
  views: [
    { type: "latex", id: "source", label: "Source", source: "\\x", engine: "pdflatex" },
    { type: "pdf", id: "pdf", label: "PDF", fileName: "a.pdf", target: "compiled", sizeBytes: 1 },
    { type: "pdf", id: "final", label: "Final PDF", fileName: "final.pdf", target: "attachment", sizeBytes: 1 },
    { type: "docx", id: "docx", label: "DOCX", fileName: "a.docx", target: "attachment", sizeBytes: 1 },
  ],
} as Pick<DocumentPreviewDescriptor, "views">;

test("prefers an explicitly attached final PDF over compiled and source views", () => {
  const ordered = selectPreviewViews(descriptor);
  assert.equal(ordered[0]?.id, "final");
  assert.equal(ordered[1]?.id, "pdf");
  assert.equal(ordered.at(-1)?.type, "latex");
  assert.equal(defaultPreviewView(descriptor)?.id, "final");
});
