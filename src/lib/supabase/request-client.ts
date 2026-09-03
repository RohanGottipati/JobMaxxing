import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { supabaseServerFetch } from "@/lib/supabase/server-fetch";
import type { Database } from "@/types/database";

export type AuthContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

function bearerToken(request?: Request) {
  return request?.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
}

export async function getAuthContextFromRequest(
  request?: Request,
): Promise<AuthContext> {
  const token = bearerToken(request);
  if (token) {
    const { url, anonKey } = getSupabaseConfig();
    const supabase = createSupabaseClient<Database>(url, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
        fetch: supabaseServerFetch,
      },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error("Authentication is required.");
    return { supabase, userId: user.id };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Authentication is required.");
  return { supabase, userId: user.id };
}

export function requireBearerAuth(request: Request) {
  if (!bearerToken(request)) {
    throw new Error("Authentication is required.");
  }
}
