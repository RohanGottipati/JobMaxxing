import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "@/lib/supabase/config";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";
import type { Database } from "@/types/database";

export function createClient() {
  const { url, publishableKey } = getSupabaseConfig();

  return createBrowserClient<Database>(url, publishableKey, {
    cookieOptions: supabaseCookieOptions(),
  });
}
