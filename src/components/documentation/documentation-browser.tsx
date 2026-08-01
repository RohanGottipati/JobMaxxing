"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenText, Clock, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  return <div className="grid gap-7"><div className="surface-grid relative max-w-2xl rounded-xl border border-border bg-card p-3 shadow-paper"><Search aria-hidden className="absolute left-6 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the product guide" className="h-10 pl-9" /></div>{categories.map((category) => <section key={category} className="grid gap-3"><h2 className="micro-label text-muted-foreground">{category}</h2><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{results.filter((article) => article.category === category).map((article) => <Link key={article.slug} href={`/documentation/${article.slug}`} className="group"><Card className="h-full bg-card transition-colors duration-200 group-hover:border-border-strong group-hover:bg-elevated group-hover:shadow-[0_8px_24px_-14px_rgb(41_40_36/0.35)]"><CardContent className="flex h-full flex-col"><div className="flex items-start justify-between"><span className="grid size-9 place-items-center rounded-md border border-border bg-parchment text-primary"><BookOpenText aria-hidden className="size-4" /></span><Badge variant="outline"><Clock aria-hidden className="mr-1 size-3" />{article.readTime}</Badge></div><h3 className="mt-4 font-semibold tracking-[-0.02em]">{article.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{article.description}</p><span className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-medium text-primary">Read guide<ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" /></span></CardContent></Card></Link>)}</div></section>)}{results.length === 0 ? <div className="surface-grid rounded-xl border border-dashed border-border-strong bg-parchment/35 p-10 text-center"><p className="font-medium">No guide matches that search.</p><p className="mt-1 text-sm text-muted-foreground">Try a feature name such as resumes, applications, or uploads.</p></div> : null}</div>;
}
