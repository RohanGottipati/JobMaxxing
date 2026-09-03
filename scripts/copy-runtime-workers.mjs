#!/usr/bin/env node
/**
 * PDF.js and the Siglum LaTeX engine both spawn workers from a URL. Bundlers
 * rewrite the package-relative paths those libraries expect, so the worker
 * files are copied into `public/` at install time and referenced by absolute
 * path. Re-running on every install keeps them in step with the installed
 * package versions.
 */
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const copies = [
  {
    from: "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
    to: "public/pdf.worker.min.mjs",
    optional: false,
  },
  {
    from: "node_modules/@siglum/engine/src/worker.js",
    to: "public/latex/siglum-worker.js",
    optional: true,
  },
];

async function packageVersion(name) {
  try {
    const raw = await readFile(resolve(root, "node_modules", name, "package.json"), "utf8");
    return JSON.parse(raw).version;
  } catch {
    return null;
  }
}

let failed = false;

for (const copy of copies) {
  const source = resolve(root, copy.from);
  const target = resolve(root, copy.to);
  try {
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
    console.log(`copied ${copy.from} -> ${copy.to}`);
  } catch (error) {
    if (copy.optional) {
      console.warn(`skipped ${copy.from}: ${error.message}`);
      continue;
    }
    console.error(`failed to copy ${copy.from}: ${error.message}`);
    failed = true;
  }
}

const pdfjs = await packageVersion("pdfjs-dist");
if (pdfjs) console.log(`pdfjs-dist worker version ${pdfjs}`);

if (failed) process.exitCode = 1;
