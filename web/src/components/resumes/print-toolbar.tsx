"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PrintToolbar({ backHref }: { backHref: string }) {
  return (
    <div className="print-controls sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/95 p-3 backdrop-blur">
      <Button asChild variant="outline" size="sm"><Link href={backHref}><ArrowLeft aria-hidden />Back to editor</Link></Button>
      <Button size="sm" onClick={() => window.print()}><Printer aria-hidden />Print or save PDF</Button>
    </div>
  );
}
