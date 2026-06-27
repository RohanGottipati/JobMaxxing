import { redirect } from "next/navigation";

import { isPreviewAuthEnabled, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type AppUser = {
  id: string;
  email: string | null;
  isPreview: boolean;
};

const previewUser: AppUser = {
  id: "preview-user",
  email: "preview@jobmaxxing.local",
  isPreview: true,
};

type GetCurrentUserOptions = {
  allowPreview?: boolean;
};

export async function getCurrentUser(options: GetCurrentUserOptions = {}) {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return {
        id: user.id,
        email: user.email ?? null,
        isPreview: false,
      } satisfies AppUser;
    }
  }

  if (options.allowPreview && isPreviewAuthEnabled()) {
    return previewUser;
  }

  return null;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser({ allowPreview: true });

  if (!user) {
    redirect("/login");
  }

  return user;
}
