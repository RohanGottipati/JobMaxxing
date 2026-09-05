"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { DocumentationArticle } from "@/lib/documentation/content";

export function DocumentationBrowser({ articles }: { articles: DocumentationArticle[] }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return articles;
    return articles.filter((article) => `${article.title} ${article.description} ${article.category}`.toLowerCase().includes(needle));
  }, [articles, query]);
  const categories = [...new Set(results.map((article) => article.category))];

  return (
    <div className="grid gap-6">
      <div className="relative max-w-xl">
        <Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search help" className="h-10 bg-card pl-9" />
      </div>
      {categories.map((category) => (
        <section key={category} className="grid gap-2">
          <h2 className="micro-label text-muted-foreground">{category}</h2>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-paper">
            {results.filter((article) => article.category === category).map((article) => (
              <Link key={article.slug} href={`/documentation/${article.slug}`} className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/30">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">{article.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{article.description}</p>
                </div>
                <Badge variant="outline" className="hidden shrink-0 sm:inline-flex"><Clock aria-hidden className="mr-1 size-3" />{article.readTime}</Badge>
                <ArrowRight aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>
      ))}
      {results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-parchment/35 p-8 text-center">
          <p className="font-medium">No matching guide</p>
          <p className="mt-1 text-sm text-muted-foreground">Try applications, extension, resumes or cover letters.</p>
        </div>
      ) : null}
    </div>
  );
}
