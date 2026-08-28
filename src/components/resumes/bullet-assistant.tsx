"use client";

import { Check, Loader2, Lock, RefreshCw, RotateCcw, Sparkles, Unlock, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BULLET_REWRITE_MODES } from "@/lib/resume-analysis/bullet-schemas";

const MODE_LABELS: Record<(typeof BULLET_REWRITE_MODES)[number], string> = {
  clarity: "Improve clarity",
  concise: "Make more concise",
  technical_detail: "Add technical detail",
  impact: "Emphasize impact",
  leadership: "Emphasize leadership",
  collaboration: "Emphasize collaboration",
  ownership: "Emphasize ownership",
  tailor_to_job: "Tailor to selected job",
  action_verbs: "Improve action verbs",
  remove_repetition: "Remove repetition",
  one_line: "Fit on one line",
  accomplishment: "Turn into an accomplishment",
  technical_recruiter: "For technical recruiters",
  nontechnical_recruiter: "For nontechnical recruiters",
};

type Suggestion = {
  id: string;
  originalText: string;
  suggestedText: string;
  explanation: string;
  factsUsed: string[];
  unsupportedClaims: string[];
  skillsAdded: string[];
  metricsAdded: string[];
  confidence: number;
  model: string | null;
};

export function BulletAssistant(props: {
  kind: "master" | "tailored";
  resumeId: string;
  applicationId: string | null;
  bulletId: string;
  locked: boolean;
  disabled?: boolean;
  onAccept: (text: string) => void;
  onToggleLock: () => void;
  onRestore: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<(typeof BULLET_REWRITE_MODES)[number]>("clarity");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/resume-bullets/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: props.kind, resumeId: props.resumeId, bulletId: props.bulletId, mode, applicationId: props.applicationId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Could not generate a suggestion.");
      setSuggestion(body);
      setText(body.suggestedText);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate a suggestion.");
    } finally {
      setLoading(false);
    }
  }

  async function decide(decision: "accepted" | "rejected") {
    if (!suggestion) return;
    setDeciding(true);
    setError(null);
    try {
      const response = await fetch(`/api/resume-bullets/suggestions/${suggestion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, editedText: decision === "accepted" ? text : undefined }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Could not save your decision.");
      if (decision === "accepted") {
        props.onAccept(body.text);
        toast.success("Suggestion applied to this resume");
      } else toast.success("Suggestion rejected");
      setOpen(false);
      setSuggestion(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your decision.");
    } finally {
      setDeciding(false);
    }
  }

  const edited = Boolean(suggestion && text.trim() !== suggestion.suggestedText.trim());
  const blockedByUnsupported = Boolean(suggestion?.unsupportedClaims.length && !edited);

  return (
    <div className="flex flex-wrap gap-1.5">
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={props.disabled || props.locked}>
            <Sparkles aria-hidden /> AI rewrite
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[min(90dvh,52rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Grounded bullet rewrite</DialogTitle>
            <DialogDescription>Suggestions may only use facts already stored in your profile or selected job. Unsupported additions are flagged and blocked by default.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor={`rewrite-mode-${props.bulletId}`}>Rewrite mode</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select id={`rewrite-mode-${props.bulletId}`} value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
                  {BULLET_REWRITE_MODES.map((value) => <option key={value} value={value}>{MODE_LABELS[value]}</option>)}
                </Select>
                <Button onClick={() => void generate()} disabled={loading} className="shrink-0">
                  {loading ? <Loader2 aria-hidden className="animate-spin" /> : suggestion ? <RefreshCw aria-hidden /> : <Sparkles aria-hidden />}
                  {suggestion ? "Regenerate" : "Generate"}
                </Button>
              </div>
            </div>
            {loading && !suggestion ? <div className="grid gap-3" aria-live="polite"><div className="h-20 animate-pulse rounded-lg bg-muted" /><p className="text-sm text-muted-foreground">Reviewing verified facts and drafting a safe alternative…</p></div> : null}
            {error ? <Alert variant="destructive"><AlertTitle>Suggestion unavailable</AlertTitle><AlertDescription>{error} <Button variant="link" className="h-auto p-0" onClick={() => void generate()}>Retry</Button></AlertDescription></Alert> : null}
            {suggestion ? <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Card><CardContent className="pt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Original</p><p className="text-sm leading-6">{suggestion.originalText}</p></CardContent></Card>
                <div className="grid gap-2"><Label htmlFor={`suggested-${suggestion.id}`}>Suggested text</Label><Textarea id={`suggested-${suggestion.id}`} value={text} onChange={(event) => setText(event.target.value)} className="min-h-32" /></div>
              </div>
              <div className="grid gap-2 rounded-lg border border-border bg-muted/25 p-3 text-sm"><p><span className="font-medium">Why:</span> {suggestion.explanation}</p><div className="flex flex-wrap gap-2"><Badge variant="outline">{Math.round(suggestion.confidence * 100)}% confidence</Badge><Badge variant="secondary">{suggestion.model ?? "Safe deterministic fallback"}</Badge></div></div>
              <EvidenceList label="Facts used" values={suggestion.factsUsed} empty="No new facts were used." />
              <div className="grid gap-3 sm:grid-cols-2"><EvidenceList label="Skills added" values={suggestion.skillsAdded} empty="No skills added." /><EvidenceList label="Metrics added" values={suggestion.metricsAdded} empty="No metrics added." /></div>
              {suggestion.unsupportedClaims.length ? <Alert variant="destructive"><AlertTitle>Unsupported claims detected</AlertTitle><AlertDescription><ul className="mt-2 list-disc space-y-1 pl-5">{suggestion.unsupportedClaims.map((claim) => <li key={claim}>{claim}</li>)}</ul><p className="mt-2">Remove these details from the editable suggestion before accepting.</p></AlertDescription></Alert> : <Alert><Check aria-hidden /><AlertTitle>Grounding check passed</AlertTitle><AlertDescription>No unsupported metrics or declared skills were detected.</AlertDescription></Alert>}
            </> : null}
          </div>
          {suggestion ? <DialogFooter className="gap-2 sm:justify-between"><Button variant="outline" onClick={() => void decide("rejected")} disabled={deciding}><X aria-hidden />Reject</Button><Button onClick={() => void decide("accepted")} disabled={deciding || !text.trim() || blockedByUnsupported}>{deciding ? <Loader2 aria-hidden className="animate-spin" /> : <Check aria-hidden />}Accept suggestion</Button></DialogFooter> : null}
        </DialogContent>
      </Dialog>
      <Button variant="ghost" size="sm" onClick={props.onRestore} disabled={props.disabled}><RotateCcw aria-hidden />Restore original</Button>
      <Button variant="ghost" size="sm" onClick={props.onToggleLock} disabled={props.disabled}>{props.locked ? <Unlock aria-hidden /> : <Lock aria-hidden />}{props.locked ? "Unlock" : "Lock"}</Button>
    </div>
  );
}

function EvidenceList({ label, values, empty }: { label: string; values: string[]; empty: string }) {
  return <div className="rounded-lg border border-border p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>{values.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{values.map((value) => <li key={value}>{value}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">{empty}</p>}</div>;
}
