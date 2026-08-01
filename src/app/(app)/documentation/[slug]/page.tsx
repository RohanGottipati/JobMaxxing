import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, Info } from "lucide-react";

import { AppPage } from "@/components/layout/app-page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { documentationArticles, getDocumentationArticle } from "@/lib/documentation/content";

export function generateStaticParams() { return documentationArticles.map((article) => ({ slug: article.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const article = getDocumentationArticle((await params).slug);
  return { title: article?.title ?? "Documentation" };
}

export default async function DocumentationArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = getDocumentationArticle((await params).slug);
  if (!article) notFound();
  const index = documentationArticles.findIndex((item) => item.slug === article.slug);
  const next = documentationArticles[index + 1] ?? null;
  return <AppPage size="wide" className="max-w-6xl"><div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]"><aside className="hidden lg:block"><div className="sticky top-20 grid gap-1 rounded-xl border border-border bg-card p-2 shadow-paper"><Link href="/documentation" className={buttonVariants({ variant: "ghost", size: "sm" })}><ArrowLeft aria-hidden />All guides</Link><p className="micro-label mb-2 mt-4 px-2 text-muted-foreground">On this page</p>{article.sections.map((section) => <Link key={section.id} href={`#${section.id}`} className="rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{section.title}</Link>)}</div></aside><article className="min-w-0"><Link href="/documentation" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground lg:hidden"><ArrowLeft aria-hidden className="size-4" />All guides</Link><div className="flex flex-wrap gap-2"><Badge variant="outline">{article.category}</Badge><Badge variant="secondary"><Clock aria-hidden className="mr-1 size-3" />{article.readTime}</Badge></div><h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.045em] sm:text-[2.7rem]">{article.title}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{article.description}</p><Card className="paper-rule mt-8"><CardContent className="divide-y divide-border">{article.sections.map((section, sectionIndex) => <section key={section.id} id={section.id} className="scroll-mt-24 py-7 first:pt-1 last:pb-1"><p className="micro-label text-primary">{String(sectionIndex + 1).padStart(2, "0")}</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.025em]">{section.title}</h2>{section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{paragraph}</p>)}{section.steps ? <ol className="mt-4 grid gap-3">{section.steps.map((step, stepIndex) => <li key={step} className="flex gap-3 text-sm leading-6"><span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-semibold text-primary">{stepIndex + 1}</span><span>{step}</span></li>)}</ol> : null}{section.note ? <Alert className="mt-5"><Info aria-hidden /><AlertTitle>Good to know</AlertTitle><AlertDescription>{section.note}</AlertDescription></Alert> : null}</section>)}</CardContent></Card>{next ? <Link href={`/documentation/${next.slug}`} className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-paper transition-colors hover:bg-muted/35"><span><span className="block text-xs text-muted-foreground">Next guide</span><span className="mt-1 block font-semibold">{next.title}</span></span><ArrowRight aria-hidden className="size-5 text-primary" /></Link> : null}</article></div></AppPage>;
}
