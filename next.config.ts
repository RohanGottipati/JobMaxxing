import type { NextConfig } from "next";

const configuredPublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ===
  "sb_publishable_your-key"
    ? undefined
    : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const requiredEnvironment = {
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    configuredPublishableKey ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
};

const placeholderValues = new Set([
  "https://your-project.supabase.co",
  "sb_publishable_your-key",
  "your-anon-key",
]);

const missingEnvironment = Object.entries(requiredEnvironment)
  .filter(([, value]) => !value?.trim() || placeholderValues.has(value))
  .map(([name]) => name);

if (process.env.NODE_ENV === "production" && missingEnvironment.length > 0) {
  throw new Error(
    `Missing required production environment variables: ${missingEnvironment.join(", ")}`,
  );
}

const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const pageSecurityHeaders = [
  ...baseSecurityHeaders,
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      { source: "/api/:path*", headers: baseSecurityHeaders },
      { source: "/((?!api/).*)", headers: pageSecurityHeaders },
    ];
  },
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas", "undici"],
  // pdf-parse loads the pdfjs "fake worker" by dynamically importing this file.
  // The standalone tracer misses that dynamic import, so force it into the
  // output for the routes that extract PDF text.
  outputFileTracingIncludes: {
    "/api/resume-imports/**": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
};

export default nextConfig;
