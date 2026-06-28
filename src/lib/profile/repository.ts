import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be signed in to view your profile.");
  }

  return { supabase, userId: user.id, email: user.email ?? null };
}

export async function getProfile(): Promise<{
  email: string | null;
  profile: Profile | null;
}> {
  const { supabase, userId, email } = await getAuthContext();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  return { email, profile: data };
}

export async function updateProfile(input: Pick<ProfileUpdate, "full_name" | "headline">) {
  const { supabase, userId } = await getAuthContext();

  const { data, error } = await supabase
    .from("profiles")
    .update(input)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
