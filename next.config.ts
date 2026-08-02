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

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
