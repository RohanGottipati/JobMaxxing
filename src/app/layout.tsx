import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

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
    <html
      lang="en"
      className="dark min-h-full"
    >
      <body className="min-h-full font-sans antialiased">
        <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
