import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";

import { buildLatexProjectArchive, latexProjectFileName } from "@/lib/latex/project-archive";

test("project archives contain main.tex plus supporting assets", async () => {
  const archive = await buildLatexProjectArchive({
    title: "Platform resume",
    source: "\\documentclass{article}\\begin{document}Hi\\end{document}",
    assets: [{ fileName: "logo.png", bytes: Uint8Array.from([1, 2, 3]).buffer }],
  });
  const zip = await JSZip.loadAsync(archive);
  assert.ok(zip.file("main.tex"));
  assert.ok(zip.file("logo.png"));
  assert.equal(await zip.file("main.tex")?.async("string"), "\\documentclass{article}\\begin{document}Hi\\end{document}");
  assert.equal(latexProjectFileName("Platform resume"), "Platform-resume.zip");
});
