import type { Metadata } from "next";
import type { ReactNode } from "react";

import { requireCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  await requireCurrentUser();
  return <main className="surface-grid min-h-dvh bg-background px-4 py-6 sm:px-6 sm:py-10">{children}</main>;
}
