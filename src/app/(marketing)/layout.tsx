import type { ReactNode } from "react";

import { MarketingHeader } from "@/components/layout/marketing-header";

export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      {children}
    </div>
  );
}
