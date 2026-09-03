import assert from "node:assert/strict";
import test from "node:test";

import {
  latexAssetSignatureMatches,
  safeLatexAssetName,
  validateLatexAsset,
  validateLatexAssetName,
} from "@/lib/latex/asset-policy";
import { MAX_LATEX_ASSET_SIZE, MAX_LATEX_ASSETS } from "@/lib/latex/constants";

test("sanitizes asset names without directory traversal", () => {
  assert.equal(safeLatexAssetName("../../logo.png"), "logo.png");
  assert.equal(safeLatexAssetName("Photo Headshot.JPG"), "Photo-Headshot.JPG");
  assert.ok(!validateLatexAssetName("logo.png"));
  assert.match(validateLatexAssetName("evil.exe") ?? "", /Supported assets/);
});

test("enforces count and size quotas", () => {
  const oversized = validateLatexAsset(
    { name: "logo.png", size: MAX_LATEX_ASSET_SIZE + 1 },
    { count: 0, totalBytes: 0 },
  );
  const tooMany = validateLatexAsset(
    { name: "logo.png", size: 100 },
    { count: MAX_LATEX_ASSETS, totalBytes: 0 },
  );
  assert.match(oversized ?? "", /5 MB/);
  assert.match(tooMany ?? "", /20/);
});

test("rejects binary files whose magic bytes do not match the extension", () => {
  assert.equal(latexAssetSignatureMatches("logo.png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47])), true);
  assert.equal(latexAssetSignatureMatches("logo.png", Uint8Array.from([0xff, 0xd8, 0xff])), false);
  assert.equal(latexAssetSignatureMatches("notes.sty", Uint8Array.from([0x25, 0x50])), true);
});
