import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getProfile } from "@/lib/profile/repository";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireCurrentUser();
  const { profile } = await getProfile();

  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email,
        name: profile?.full_name?.trim() || user.email?.split("@")[0] || "User",
      }}
    >
      {children}
    </AppShell>
  );
}
