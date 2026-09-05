import assert from "node:assert/strict";
import test from "node:test";

import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";

const ENVIRONMENT_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

test("prefers the current Supabase publishable key and keeps a legacy fallback", () => {
  const previous = Object.fromEntries(
    ENVIRONMENT_KEYS.map((key) => [key, process.env[key]]),
  );

  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy-anon";
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    assert.equal(isSupabaseConfigured(), true);
    assert.equal(getSupabaseConfig().publishableKey, "legacy-anon");

    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "sb_publishable_your-key";
    assert.equal(getSupabaseConfig().publishableKey, "legacy-anon");

    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_current";
    assert.equal(
      getSupabaseConfig().publishableKey,
      "sb_publishable_current",
    );

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co";
    assert.equal(isSupabaseConfigured(), false);
  } finally {
    for (const key of ENVIRONMENT_KEYS) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
