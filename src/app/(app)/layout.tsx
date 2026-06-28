import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireCurrentUser } from "@/lib/auth/current-user";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireCurrentUser();

  return <AppShell>{children}</AppShell>;
}
