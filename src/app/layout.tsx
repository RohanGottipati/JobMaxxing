import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/theme-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "JobMaxxing — Run your job search like a system",
    template: "%s · JobMaxxing",
  },
  description:
    "Track every opportunity, manage tailored resumes and cover letters, and move your job search forward with clarity.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f7f4ed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="light min-h-full" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-full font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
          <TooltipProvider delayDuration={100}>{children}</TooltipProvider>
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
