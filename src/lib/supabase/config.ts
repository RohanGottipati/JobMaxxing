const PLACEHOLDER_SUPABASE_URL = "https://your-project.supabase.co";
const PLACEHOLDER_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_your-key";
const PLACEHOLDER_SUPABASE_ANON_KEY = "your-anon-key";

export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

function publicApiKey() {
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (
    publishableKey &&
    publishableKey !== PLACEHOLDER_SUPABASE_PUBLISHABLE_KEY
  ) {
    return publishableKey;
  }

  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || publishableKey;
}

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = publicApiKey();

  return Boolean(
    url &&
      publishableKey &&
      url !== PLACEHOLDER_SUPABASE_URL &&
      publishableKey !== PLACEHOLDER_SUPABASE_PUBLISHABLE_KEY &&
      publishableKey !== PLACEHOLDER_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseConfig(): SupabaseConfig {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publishableKey: publicApiKey()!,
  };
}
