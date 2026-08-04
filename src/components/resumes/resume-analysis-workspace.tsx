"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ResumeAnalysisResult, ResumeScoreCategory } from "@/lib/resume-analysis/schemas";
import { cn } from "@/lib/utils";

type Analysis = ResumeAnalysisResult & { id: string; createdAt: string; documentRowVersion?: number; remaining?: number };

const CATEGORY_LABELS: Record<ResumeScoreCategory, string> = {
  atsReadability: "ATS readability", contentQuality: "Content quality", writingQuality: "Writing quality", jobRelevance: "Job relevance", applicationReadiness: "Application readiness", contactCompleteness: "Contact completeness", formatting: "Formatting", impact: "Impact", quantification: "Quantification", actionVerbs: "Action verbs", brevity: "Brevity", technicalDepth: "Technical depth", leadershipEvidence: "Leadership evidence", consistency: "Consistency", dateConsistency: "Date consistency", sectionCompleteness: "Section completeness",
};

export function ResumeAnalysisWorkspace(props: {
  kind: "master" | "tailored";
  resumeId: string;
  resumeTitle: string;
  editorHref: string;
  initialHistory: Analysis[];
}) {
  const [history, setHistory] = useState(props.initialHistory);
  const [selectedId, setSelectedId] = useState(props.initialHistory[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = history.find((item) => item.id === selectedId) ?? history[0] ?? null;

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/resume-analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: props.kind, resumeId: props.resumeId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Resume review failed.");
      setHistory((current) => [body, ...current.filter((item) => item.id !== body.id)]);
      setSelectedId(body.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Resume review failed.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="grid gap-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Link href={props.editorHref} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 mb-2 text-muted-foreground")}><ArrowLeft aria-hidden />Back to editor</Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Resume review</h1>
        <p className="mt-1 text-sm text-muted-foreground">Explainable scoring and prioritized reviewer feedback for {props.resumeTitle}.</p>
      </div>
      <Button onClick={() => void analyze()} disabled={loading}>{loading ? <Loader2 aria-hidden className="animate-spin" /> : <Sparkles aria-hidden />}{selected ? "Run new review" : "Review resume"}</Button>
    </header>
    {error ? <Alert variant="destructive"><AlertTitle>Review failed</AlertTitle><AlertDescription>{error} <Button variant="link" className="h-auto p-0" onClick={() => void analyze()}>Retry</Button></AlertDescription></Alert> : null}
    {loading && !selected ? <AnalysisSkeleton /> : selected ? <AnalysisView analysis={selected} history={history} onSelect={setSelectedId} editorHref={props.editorHref} /> : <Card className="border-dashed"><CardContent className="grid place-items-center gap-3 py-14 text-center"><span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><TrendingUp aria-hidden /></span><div><p className="font-medium">No score yet</p><p className="mt-1 max-w-md text-sm text-muted-foreground">Run a review to check ATS readability, content, impact, dates, evidence, writing, and six recruiter perspectives.</p></div><Button onClick={() => void analyze()}><Sparkles aria-hidden />Start review</Button></CardContent></Card>}
  </div>;
}

function AnalysisView({ analysis, history, onSelect, editorHref }: { analysis: Analysis; history: Analysis[]; onSelect: (id: string) => void; editorHref: string }) {
  return <Tabs defaultValue="overview" className="min-w-0">
    <TabsList className="w-full justify-start overflow-x-auto"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="deductions">Fixes ({analysis.deductions.length})</TabsTrigger><TabsTrigger value="reviewers">Reviewer panel</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>
    <TabsContent value="overview" className="grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)]">
      <Card><CardHeader><CardTitle>Overall score</CardTitle><CardDescription>{analysis.analysisKind === "combined" ? "Deterministic + semantic review" : "Deterministic review"}</CardDescription></CardHeader><CardContent><div className="grid place-items-center"><div className="grid size-36 place-items-center rounded-full border-[10px] border-primary/15 bg-primary/5"><span className="text-4xl font-semibold tabular-nums">{analysis.overallScore}</span><span className="-mt-7 text-xs text-muted-foreground">out of 100</span></div></div><p className="mt-4 text-center text-xs text-muted-foreground">Every deduction is itemized; the score is not a hiring prediction.</p></CardContent></Card>
      <div className="grid gap-5"><Card><CardHeader><CardTitle>Score breakdown</CardTitle><CardDescription>Job relevance is neutral until a job is selected in the application match workspace.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{Object.entries(analysis.categoryScores).map(([key, value]) => <div key={key} className="grid gap-1.5"><div className="flex justify-between gap-3 text-sm"><span>{CATEGORY_LABELS[key as ResumeScoreCategory]}</span><span className="font-medium tabular-nums">{value}</span></div><Progress value={value} /></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Strengths</CardTitle></CardHeader><CardContent>{analysis.strengths.length ? <ul className="grid gap-2">{analysis.strengths.map((strength) => <li key={strength} className="flex gap-2 text-sm"><CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />{strength}</li>)}</ul> : <p className="text-sm text-muted-foreground">No strengths were recorded in this run.</p>}</CardContent></Card></div>
    </TabsContent>
    <TabsContent value="deductions" className="grid gap-3">{analysis.deductions.length ? analysis.deductions.sort((a, b) => b.points - a.points).map((item) => <Card key={item.id}><CardContent className="grid gap-3 pt-5 sm:grid-cols-[auto_minmax(0,1fr)_auto]"><AlertTriangle aria-hidden className="mt-0.5 size-5 text-warning" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{item.problem}</p><Badge variant="outline">{CATEGORY_LABELS[item.category]}</Badge></div><p className="mt-1 text-xs font-medium text-muted-foreground">{item.location}</p><p className="mt-2 text-sm leading-6">{item.why}</p><p className="mt-2 text-sm"><span className="font-medium">Recommended fix:</span> {item.recommendedFix}</p></div><div className="flex items-start gap-2 sm:flex-col sm:items-end"><Badge variant="destructive">−{item.points} pts</Badge>{item.action.href ? <Link href={item.action.href === "/profile" ? item.action.href : editorHref} className={buttonVariants({ variant: "outline", size: "sm" })}>{item.action.label}</Link> : null}</div></CardContent></Card>) : <Alert><CheckCircle2 aria-hidden /><AlertTitle>No deductions</AlertTitle><AlertDescription>The deterministic checks did not find a score deduction in this version.</AlertDescription></Alert>}</TabsContent>
    <TabsContent value="reviewers" className="grid gap-5"><PriorityGroup title="Critical fixes" values={analysis.reviews.criticalFixes} /><PriorityGroup title="High-impact improvements" values={analysis.reviews.highImpactImprovements} /><div className="grid gap-4 lg:grid-cols-2">{analysis.reviews.perspectives.map((review) => <Card key={review.reviewer}><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{review.label}</CardTitle><CardDescription>{review.focus}</CardDescription></div><Badge>{review.score}</Badge></div></CardHeader><CardContent className="grid gap-3">{review.findings.map((finding, index) => <div key={`${finding.title}-${index}`} className="rounded-lg border border-border p-3"><div className="flex flex-wrap gap-2"><Badge variant={finding.priority === "critical" ? "destructive" : finding.priority === "strength" ? "secondary" : "outline"}>{finding.priority}</Badge><p className="font-medium">{finding.title}</p></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{finding.detail}</p>{finding.location ? <p className="mt-2 text-xs font-medium">{finding.location}</p> : null}</div>)}</CardContent></Card>)}</div><div className="grid gap-4 lg:grid-cols-3"><PriorityGroup title="Credibility concerns" values={analysis.reviews.credibilityConcerns} /><PriorityGroup title="Missing evidence" values={analysis.reviews.missingEvidence} /><PriorityGroup title="Optional improvements" values={analysis.reviews.optionalImprovements} /></div></TabsContent>
    <TabsContent value="history"><Card><CardHeader><CardTitle>Score history</CardTitle><CardDescription>Compare immutable snapshots over time. Small changes do not imply hiring outcomes.</CardDescription></CardHeader><CardContent>{history.length ? <div className="grid gap-2">{history.map((item) => <button key={item.id} type="button" onClick={() => onSelect(item.id)} className={cn("grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border p-3 text-left focus-visible:outline-2", item.id === analysis.id && "border-primary bg-primary/5")}><span className="text-xl font-semibold tabular-nums">{item.overallScore}</span><span><span className="block text-sm font-medium">{item.analysisKind === "combined" ? "Combined review" : "Deterministic review"}</span><span className="block text-xs text-muted-foreground">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</span></span><Badge variant="outline">Revision {item.documentRowVersion ?? "—"}</Badge></button>)}</div> : <p className="text-sm text-muted-foreground">No history yet.</p>}</CardContent></Card></TabsContent>
  </Tabs>;
}

function PriorityGroup({ title, values }: { title: string; values: string[] }) { return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent>{values.length ? <ul className="list-disc space-y-2 pl-5 text-sm leading-6">{values.map((value) => <li key={value}>{value}</li>)}</ul> : <p className="text-sm text-muted-foreground">Nothing prioritized here.</p>}</CardContent></Card>; }
function AnalysisSkeleton() { return <div className="grid gap-4" aria-live="polite"><div className="h-44 animate-pulse rounded-xl bg-muted" /><div className="grid gap-4 sm:grid-cols-2"><div className="h-64 animate-pulse rounded-xl bg-muted" /><div className="h-64 animate-pulse rounded-xl bg-muted" /></div><p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 aria-hidden className="animate-spin" />Running deterministic checks and reviewer analysis…</p></div>; }
