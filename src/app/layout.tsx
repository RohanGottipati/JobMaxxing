import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/layout/site-header";

import "./globals.css";

export const metadata: Metadata = {
  title: "JobMaxxing",
  description: "Track job applications, statuses, notes, and materials.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="min-h-full">
      <body className="min-h-full bg-background font-sans antialiased">
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          {children}
        </div>
      </body>
    </html>
  );
}
