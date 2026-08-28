import Link from "next/link";

import { Brand } from "@/components/layout/brand";

const columns = [
  {
    title: "Product",
    links: [["Features", "/#features"], ["How it works", "/#how-it-works"], ["Dashboard", "/dashboard"]],
  },
  {
    title: "Guides",
    links: [["Getting started", "/documentation/getting-started"], ["Applications", "/documentation/applications"], ["Uploads & privacy", "/documentation/uploads-and-privacy"]],
  },
  {
    title: "Account",
    links: [["Log in", "/login"], ["Sign up", "/signup"], ["FAQ", "/#faq"]],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="bg-background">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-12">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,150px))]">
          <div>
            <Brand />
            <p className="mt-3 max-w-xs text-[0.82rem] leading-6 text-muted-foreground">
              A calm, private operating system for one job search. Built for people who would rather think than remember.
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <p className="micro-label text-muted-foreground">{column.title}</p>
              <ul className="mt-3 grid gap-2">
                {column.links.map(([label, href]) => (
                  <li key={label}><Link href={href} className="text-[0.82rem] text-muted-foreground transition-colors hover:text-foreground">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} JobMaxxing. All rights reserved.</p>
          <p>Private by design · Your data stays yours</p>
        </div>
      </div>
    </footer>
  );
}
