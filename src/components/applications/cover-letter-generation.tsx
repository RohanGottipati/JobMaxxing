"use client";

import Link from "next/link";
import { Clipboard, FileText, Loader2, Maximize2, Minimize2, RefreshCw, Sparkles } from "lucide-react";
import { useMemo } from "react";

import type {
  BusyAction,
  CoverLetterGeneration,
  ResumeMatchOption,
} from "@/components/applications/application-match-types";
import { toResumeValue } from "@/components/applications/application-match-types";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export const COVER_LETTER_TONES = {
  direct: "Direct and concise",
  warm: "Warm and conversational",
  technical: "Technical",
  startup: "Startup-oriented",
  formal: "Formal",
  enthusiastic: "Enthusiastic but natural",
} as const;

export function CoverLetterGenerator({
  resumeOptions,
  selectedResume,
  tone,
  maxWords,
  letter,
  history,
  busy,
  onResumeChange,
  onToneChange,
  onMaxWordsChange,
  onGenerate,
  onCopy,
  onSelectVersion,
  onTransform,
}: {
  resumeOptions: ResumeMatchOption[];
  selectedResume: string;
  tone: keyof typeof COVER_LETTER_TONES;
  maxWords: 150 | 200 | 300;
  letter: CoverLetterGeneration | null;
  history: CoverLetterGeneration[];
  busy: BusyAction;
  onResumeChange: (value: string) => void;
  onToneChange: (value: keyof typeof COVER_LETTER_TONES) => void;
  onMaxWordsChange: (value: 150 | 200 | 300) => void;
  onGenerate: () => void;
  onCopy: () => void;
  onSelectVersion: (id: string) => void;
  onTransform: (
    action: "regenerate_paragraph" | "shorten" | "expand",
    paragraphIndex?: number,
  ) => void;
}) {
  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Generate a grounded cover letter</CardTitle>
          <CardDescription>
            The letter uses verified achievements visible in the selected resume, is saved to this application, and never invents company facts.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(12rem,0.7fr)_10rem_auto] lg:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="letter-resume">Resume evidence</Label>
            <Select id="letter-resume" value={selectedResume} onChange={(event) => onResumeChange(event.target.value)} disabled={!resumeOptions.length}>
              {!resumeOptions.length ? <option value="">No structured resume</option> : null}
              {resumeOptions.map((option) => (
                <option key={toResumeValue(option)} value={toResumeValue(option)}>
                  {option.kind === "master" ? "Master · " : "Tailored · "}{option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="letter-tone">Tone</Label>
            <Select id="letter-tone" value={tone} onChange={(event) => onToneChange(event.target.value as keyof typeof COVER_LETTER_TONES)}>
              {Object.entries(COVER_LETTER_TONES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="letter-length">Maximum length</Label>
            <Select id="letter-length" value={maxWords} onChange={(event) => onMaxWordsChange(Number(event.target.value) as 150 | 200 | 300)}>
              <option value={150}>150 words</option>
              <option value={200}>200 words</option>
              <option value={300}>300 words</option>
            </Select>
          </div>
          <Button onClick={onGenerate} disabled={!selectedResume || busy !== null}>
            {busy === "cover_letter" ? <Loader2 aria-hidden className="animate-spin" /> : letter ? <RefreshCw aria-hidden /> : <Sparkles aria-hidden />}
            {letter ? "Regenerate" : "Generate"}
          </Button>
        </CardContent>
      </Card>

      {busy === "cover_letter" && !letter ? (
        <LetterSkeleton />
      ) : letter ? (
        <CoverLetterResult
          letter={letter}
          history={history}
          busy={busy}
          onCopy={onCopy}
          onSelectVersion={onSelectVersion}
          onTransform={onTransform}
        />
      ) : (
        <Card className="border-dashed">
          <CardContent className="grid place-items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><FileText aria-hidden /></span>
            <div>
              <p className="font-medium">No generated letter yet</p>
              <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">
                Generation requires at least one verified achievement visible in the selected structured resume.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CoverLetterResult({
  letter,
  history,
  busy,
  onCopy,
  onSelectVersion,
  onTransform,
}: {
  letter: CoverLetterGeneration;
  history: CoverLetterGeneration[];
  busy: BusyAction;
  onCopy: () => void;
  onSelectVersion: (id: string) => void;
  onTransform: (
    action: "regenerate_paragraph" | "shorten" | "expand",
    paragraphIndex?: number,
  ) => void;
}) {
  const evidenceById = useMemo(
    () => new Map(letter.evidence.map((item) => [item.id, item])),
    [letter.evidence],
  );
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <Card>
        <CardHeader className="border-b border-border bg-parchment/35">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Saved cover letter · version {letter.versionNumber}</CardTitle>
              <CardDescription>{letter.model ?? "Safe deterministic fallback"} · evidence linked</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.length > 1 ? (
                <Select
                  aria-label="Saved cover letter version"
                  className="h-8 w-full min-w-44 sm:w-auto"
                  value={letter.id}
                  onChange={(event) => onSelectVersion(event.target.value)}
                >
                  {history.map((item) => (
                    <option key={item.id} value={item.id}>
                      Version {item.versionNumber} · {COVER_LETTER_TONES[item.tone]} · {item.maxWords} words
                    </option>
                  ))}
                </Select>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTransform("shorten")}
                disabled={busy !== null || letter.maxWords === 150}
              >
                <Minimize2 aria-hidden />Shorten
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTransform("expand")}
                disabled={busy !== null || letter.maxWords === 300}
              >
                <Maximize2 aria-hidden />Expand
              </Button>
              <Button variant="outline" size="sm" onClick={onCopy}><Clipboard aria-hidden />Copy</Button>
              <Link href={"/cover-letters/" + letter.id} className={buttonVariants({ size: "sm" })}>Edit and export</Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="paper-rule whitespace-pre-wrap rounded-lg border border-border bg-parchment/40 p-5 text-sm leading-8">{letter.content}</div>
        </CardContent>
      </Card>
      <aside className="grid content-start gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Evidence by paragraph</CardTitle>
            <CardDescription>Trace generated candidate claims back to verified resume facts.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-4">
              {letter.paragraphs.map((paragraph, index) => (
                <li key={paragraph.text + "-" + index} className="rounded-lg border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paragraph {index + 1}</p>
                  <p className="mt-2 line-clamp-3 text-xs leading-5">{paragraph.text}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {paragraph.evidenceIds.length ? paragraph.evidenceIds.map((id) => (
                      <Badge key={id} variant="outline" className="h-auto whitespace-normal">{evidenceById.get(id)?.label ?? "Verified evidence"}</Badge>
                    )) : <Badge variant="secondary">No candidate claim</Badge>}
                  </div>
                  <Button
                    className="mt-3"
                    variant="ghost"
                    size="sm"
                    onClick={() => onTransform("regenerate_paragraph", index)}
                    disabled={busy !== null}
                    aria-label={`Regenerate paragraph ${index + 1} from the same verified evidence`}
                  >
                    {busy === "cover_letter_transform" ? <Loader2 aria-hidden className="animate-spin" /> : <RefreshCw aria-hidden />}
                    Regenerate paragraph
                  </Button>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function LetterSkeleton() {
  return (
    <Card aria-live="polite">
      <CardContent className="grid gap-3 py-8">
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-5 w-full animate-pulse rounded bg-muted" />
        <div className="h-5 w-5/6 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-5 w-full animate-pulse rounded bg-muted" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 aria-hidden className="animate-spin" />Drafting from verified resume evidence…</p>
      </CardContent>
    </Card>
  );
}
