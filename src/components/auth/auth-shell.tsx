import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

import { BrandMark } from "@/components/layout/brand";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="relative isolate flex flex-1 items-center bg-parchment px-4 py-10 surface-grid sm:px-6 sm:py-16">
      <div className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-xl border border-border-strong bg-card shadow-[0_12px_36px_-22px_rgb(41_40_36/0.45)] lg:grid-cols-[1fr_0.92fr]">
        <section className="paper-rule relative hidden overflow-hidden border-r border-border bg-parchment/65 p-9 lg:flex lg:flex-col lg:justify-between">
          <div>
            <BrandMark className="size-10" />
            <h2 className="mt-7 max-w-sm text-[1.8rem] font-semibold tracking-[-0.04em]">One focused workspace for the search ahead.</h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">Keep your applications, career profile, resumes, cover letters, deadlines, and next actions connected.</p>
          </div>
          <ul className="mt-12 grid gap-3 text-sm">
            {["A clear application pipeline", "Private document storage", "Submitted-version history"].map((item) => <li key={item} className="flex items-center gap-2.5"><CheckCircle2 aria-hidden className="size-4 text-primary" />{item}</li>)}
          </ul>
        </section>
        <section className="p-2 sm:p-5 lg:p-7">
          <Card className="border-0 bg-transparent shadow-none ring-0">
            <CardHeader className="pb-3 text-center sm:text-left">
              <CardTitle className="text-2xl tracking-[-0.035em]">{title}</CardTitle>
              <CardDescription className="leading-6">{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {children}
              <div className="text-center text-sm text-muted-foreground sm:text-left">{footer}</div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
