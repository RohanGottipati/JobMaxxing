#!/usr/bin/env node
/**
 * Downloads the TeX Live 2025 runtime the browser LaTeX compiler needs and
 * self-hosts it under `public/latex/`. The payload is ~225 MB, so this is an
 * opt-in step (`npm run latex:assets`) rather than part of `postinstall`.
 *
 * Integrity: the first successful run records each artifact's SHA-256 in
 * `latex-runtime.lock.json`. Commit that file, and every later run on every
 * machine verifies the download against it and refuses to install a mismatch.
 * Pass `--update-lock` to intentionally re-pin after an upstream release.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const target = resolve(root, "public/latex");
const lockPath = resolve(root, "latex-runtime.lock.json");
const baseUrl = process.env.LATEX_RUNTIME_CDN ?? "https://cdn.siglum.org/tl2025";
const bundleRelease = process.env.LATEX_BUNDLE_RELEASE ?? "siglum-bundles-v0.1.0.tar.gz";
const updateLock = process.argv.includes("--update-lock");

const artifacts = [
  { name: "busytex.wasm", url: `${baseUrl}/busytex.wasm`, kind: "file" },
  { name: "busytex.js", url: `${baseUrl}/busytex.js`, kind: "file" },
  { name: bundleRelease, url: `${baseUrl}/${bundleRelease}`, kind: "archive" },
];

async function readLock() {
  try {
    return JSON.parse(await readFile(lockPath, "utf8"));
  } catch {
    return { source: baseUrl, artifacts: {} };
  }
}

async function sha256(path) {
  const hash = createHash("sha256");
  await pipeline(createReadStream(path), hash);
  return hash.digest("hex");
}

async function download(url, path) {
  process.stdout.write(`downloading ${url}\n`);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`${url} responded ${response.status}`);
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, response.body);
}

async function extract(archivePath) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("tar", ["-xzf", archivePath, "-C", target], { stdio: "inherit" });
    child.on("error", rejectPromise);
    child.on("exit", (code) =>
      code === 0 ? resolvePromise() : rejectPromise(new Error(`tar exited ${code}`)),
    );
  });
}

const lock = await readLock();
await mkdir(target, { recursive: true });

for (const artifact of artifacts) {
  const staged = resolve(target, `${artifact.name}.download`);
  await download(artifact.url, staged);

  const digest = await sha256(staged);
  const expected = lock.artifacts[artifact.name];

  if (expected && expected !== digest) {
    await rm(staged, { force: true });
    throw new Error(
      `Checksum mismatch for ${artifact.name}.\n  expected ${expected}\n  received ${digest}\n` +
        "Refusing to install. Re-run with --update-lock only if you intend to re-pin this release.",
    );
  }

  if (!expected || updateLock) lock.artifacts[artifact.name] = digest;

  if (artifact.kind === "archive") {
    await extract(staged);
    await rm(staged, { force: true });
  } else {
    await rename(staged, resolve(target, artifact.name));
  }

  process.stdout.write(`  ${artifact.name} sha256=${digest}\n`);
}

lock.source = baseUrl;
lock.bundleRelease = bundleRelease;
await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);

process.stdout.write(
  `\nLaTeX runtime installed to public/latex.\nSet NEXT_PUBLIC_LATEX_RUNTIME_URL=/latex to serve it from this app.\n`,
);
