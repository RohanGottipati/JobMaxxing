const PLACEHOLDER_SUPABASE_URL = "https://your-project.supabase.co";
const PLACEHOLDER_SUPABASE_ANON_KEY = "your-anon-key";

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(
    url &&
      anonKey &&
      url !== PLACEHOLDER_SUPABASE_URL &&
      anonKey !== PLACEHOLDER_SUPABASE_ANON_KEY,
  );
}

export function isPreviewAuthEnabled() {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  if (process.env.NEXT_PUBLIC_ENABLE_AUTH_PREVIEW === "false") {
    return false;
  }

  return (
    process.env.NEXT_PUBLIC_ENABLE_AUTH_PREVIEW === "true" ||
    !isSupabaseConfigured()
  );
}
