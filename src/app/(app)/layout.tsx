import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser({ allowPreview: true });

  return (
    <AppShell isPreview={user?.isPreview}>
      {children}
    </AppShell>
  );
}
