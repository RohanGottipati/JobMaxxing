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

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse", "undici"],
};

export default nextConfig;
