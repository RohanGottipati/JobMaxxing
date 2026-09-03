import { resolve } from "node:path";

import type { NextConfig } from "next";

const requiredEnvironment = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
};

const placeholderValues = new Set([
  "https://your-project.supabase.co",
  "your-anon-key",
  "your-gemini-api-key",
]);

const missingEnvironment = Object.entries(requiredEnvironment)
  .filter(([, value]) => !value?.trim() || placeholderValues.has(value))
  .map(([name]) => name);

if (process.env.NODE_ENV === "production" && missingEnvironment.length > 0) {
  throw new Error(
    `Missing required production environment variables: ${missingEnvironment.join(", ")}`,
  );
}

const isolationHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse", "@siglum/engine", "undici"],
  // `blake3-wasm@2.1.5` (a `@siglum/engine` dependency) publishes a browser
  // entry that re-exports a file missing from the package, so bundlers cannot
  // resolve it. The engine guards the import with a DJB2 fallback, so point
  // the specifier at a stub that rejects on evaluation.
  turbopack: {
    resolveAlias: {
      "blake3-wasm/browser.js": {
        browser: "./src/lib/latex/blake3-unavailable.ts",
      },
    },
  },
  webpack(config) {
    config.resolve.alias["blake3-wasm/browser.js$"] = resolve(
      __dirname,
      "src/lib/latex/blake3-unavailable.ts",
    );
    return config;
  },
  async headers() {
    return [
      {
        source: "/latex",
        headers: isolationHeaders,
      },
      {
        source: "/latex/:path*",
        headers: isolationHeaders,
      },
      {
        source: "/latex/:file(busytex.wasm|busytex.js|siglum-worker.js)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      {
        source: "/latex/bundles/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
