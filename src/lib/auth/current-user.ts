import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AppUser = {
  id: string;
  email: string | null;
};

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
  };
}

export async function requireCurrentUser(): Promise<AppUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
