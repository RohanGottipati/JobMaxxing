import assert from "node:assert/strict";
import test from "node:test";

import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import { generateResumeDocx } from "./docx";
import { generateResumePdf } from "./pdf";
import { createResumeRenderModel } from "./render-model";
import { careerProfileFixture, resumeDocumentFixture } from "../test/fixtures";

test("generates parseable selectable-text PDF and DOCX files", async () => {
  const model = createResumeRenderModel(resumeDocumentFixture(), careerProfileFixture());
  const [pdf, docx] = await Promise.all([generateResumePdf(model), generateResumeDocx(model)]);

  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.equal(docx.subarray(0, 2).toString("ascii"), "PK");

  const pdfParser = new PDFParse({ data: pdf });
  try {
    const text = (await pdfParser.getText()).text;
    assert.match(text, /Ada Lovelace/);
    assert.match(text, /Reduced API latency by 30%/);
  } finally {
    await pdfParser.destroy();
  }

  const docxText = (await mammoth.extractRawText({ buffer: docx })).value;
  assert.match(docxText, /Ada Lovelace/);
  assert.match(docxText, /Reduced API latency by 30%/);
});
