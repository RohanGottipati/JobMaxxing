/**
 * Self-hosted TeX Live assets live under `/latex` after `npm run latex:assets`.
 * Override with NEXT_PUBLIC_LATEX_RUNTIME_URL when serving them from another origin
 * that sends matching COOP/COEP headers.
 */
export const LATEX_RUNTIME_BASE =
  process.env.NEXT_PUBLIC_LATEX_RUNTIME_URL?.replace(/\/$/, "") || "/latex";

export function latexRuntimeUrls() {
  return {
    bundlesUrl: `${LATEX_RUNTIME_BASE}/bundles`,
    wasmUrl: `${LATEX_RUNTIME_BASE}/busytex.wasm`,
    jsUrl: `${LATEX_RUNTIME_BASE}/busytex.js`,
    workerUrl: `${LATEX_RUNTIME_BASE}/siglum-worker.js`,
  };
}

export function latexRuntimeProbeUrl() {
  return latexRuntimeUrls().wasmUrl;
}
