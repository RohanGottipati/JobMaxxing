/**
 * `blake3-wasm@2.1.5` ships a broken bundler entry: its root `browser.js`
 * re-exports `./dist/wasm/browser/blake3_js_bg.js`, a file the package does
 * not publish, so neither Turbopack nor webpack can bundle the real module.
 *
 * `@siglum/engine` only imports it inside a `.catch()`-guarded dynamic import
 * and falls back to its built-in DJB2 hash when the import rejects. Aliasing
 * the broken specifier here (see `turbopack.resolveAlias` and the webpack
 * alias in `next.config.ts`) lets the build succeed and guarantees that
 * fallback at runtime by rejecting the import on evaluation.
 */
throw new Error(
  "blake3-wasm is unavailable in this bundle; the LaTeX compiler uses its DJB2 hash fallback.",
);
