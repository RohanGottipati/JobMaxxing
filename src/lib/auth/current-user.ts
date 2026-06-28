import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AppUser = {
  id: string;
  email: string | null;
};

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();

  try {
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
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn(`[supabase] Current user lookup failed: ${message}`);
    }
    return null;
  }
}

export async function requireCurrentUser(): Promise<AppUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
