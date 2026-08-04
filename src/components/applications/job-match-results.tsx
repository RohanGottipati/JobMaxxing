"use client";

import {
  AlertTriangle,
  CheckCircle2,
  GitCompareArrows,
  Loader2,
  WandSparkles,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import type { JobMatchView } from "@/components/applications/application-match-types";
import { humanize } from "@/components/applications/application-match-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EvidenceMatrixRow, JobMatchResult } from "@/lib/job-intelligence/schemas";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<keyof JobMatchResult["categoryScores"], string> = {
  requiredSkillOverlap: "Required skills",
  preferredSkillOverlap: "Preferred skills",
  roleSimilarity: "Role similarity",
  seniorityFit: "Seniority fit",
  experienceDomainFit: "Domain experience",
  educationFit: "Education",
  locationFit: "Location",
  workArrangementFit: "Work arrangement",
  compensationFit: "Compensation",
  workAuthorizationFit: "Work authorization",
};

const STRENGTH_LABELS: Record<EvidenceMatrixRow["strength"], string> = {
  strong: "Strong evidence",
  partial: "Partial evidence",
  related: "Related evidence",
  none: "No evidence",
  unverified: "Unverified evidence",
};

export function JobMatchResults({
  match,
  matches,
  onSelect,
  onTailor,
  tailoring,
}: {
  match: JobMatchView;
  matches: JobMatchView[];
  onSelect: (id: string) => void;
  onTailor: () => void;
  tailoring: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-5">
      <div className="grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Overall match</CardTitle>
            <CardDescription>Evidence weighted and explainable</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid place-items-center">
              <div className="grid size-36 place-items-center rounded-full border-[10px] border-primary/15 bg-primary/5">
                <span className="text-4xl font-semibold tabular-nums">{match.overallScore}</span>
                <span className="-mt-7 text-xs text-muted-foreground">out of 100</span>
              </div>
            </div>
            <Badge variant={match.applyReasonable ? "secondary" : "destructive"} className="mx-auto h-auto max-w-full whitespace-normal px-3 py-1 text-center">
              {match.applyReasonable ? "Applying is reasonable" : "Review concerns first"}
            </Badge>
            <p className="text-center text-xs leading-5 text-muted-foreground">{match.rationale}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Score breakdown</CardTitle>
                <CardDescription>Preferences and hard conflicts are scored separately from skills.</CardDescription>
              </div>
              {matches.length > 1 ? (
                <Select aria-label="Match history" className="w-full sm:w-60" value={match.id} onChange={(event) => onSelect(event.target.value)}>
                  {matches.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.resumeKind === "master" ? "Master" : "Tailored"} · {item.overallScore}% · {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(item.createdAt))}
                    </option>
                  ))}
                </Select>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {Object.entries(match.categoryScores).map(([key, value]) => (
              <div key={key} className="grid gap-1.5">
                <div className="flex justify-between gap-3 text-sm">
                  <span>{CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS]}</span>
                  <span className="font-medium tabular-nums">{value}</span>
                </div>
                <Progress value={value} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <MatchList title="Strong matches" values={match.strongMatches} empty="No requirement has strong verified evidence yet." tone="success" />
        <MatchList title="Partial matches" values={match.partialMatches} empty="No partial or unverified matches." tone="warning" />
        <MatchList title="Missing requirements" values={match.missingRequirements} empty="No missing requirements detected." tone="danger" />
      </div>

      {match.concerns.length ? (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden />
          <AlertTitle>Possible concerns</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {match.concerns.map((concern) => <li key={concern}>{concern}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {match.isStale ? (
        <Alert>
          <RefreshNoticeIcon />
          <AlertTitle>This match is out of date</AlertTitle>
          <AlertDescription>
            The job review, profile, or resume changed after this score was saved. Run a new match before tailoring.
          </AlertDescription>
        </Alert>
      ) : null}

      <EvidenceMatrix rows={match.evidenceMatrix} />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Recommended resume actions</CardTitle>
              <CardDescription>Missing skills are never converted into claims. Build evidence before adding them.</CardDescription>
            </div>
            <Button onClick={onTailor} disabled={tailoring || match.resumeKind !== "master" || match.isStale}>
              {tailoring ? <Loader2 aria-hidden className="animate-spin" /> : <WandSparkles aria-hidden />}
              Build tailoring diff
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {match.recommendedChanges.length ? (
            <ol className="grid gap-3">
              {match.recommendedChanges.map((item) => (
                <li key={item.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={item.priority === "critical" ? "destructive" : "outline"}>{item.priority}</Badge>
                    <p className="font-medium">{item.recommendation}</p>
                  </div>
                  {item.evidence.length ? <p className="mt-2 text-xs leading-5 text-muted-foreground">Evidence: {item.evidence.join(" · ")}</p> : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No resume changes were recommended.</p>
          )}
          {match.resumeKind !== "master" ? <p className="mt-3 text-xs text-muted-foreground">Select and score a master resume to branch a new tailored version.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function RefreshNoticeIcon() {
  return <AlertTriangle aria-hidden />;
}

function MatchList({
  title,
  values,
  empty,
  tone,
}: {
  title: string;
  values: string[];
  empty: string;
  tone: "success" | "warning" | "danger";
}) {
  const icon: ReactNode = tone === "success"
    ? <CheckCircle2 aria-hidden className="mt-1 size-4 shrink-0 text-success" />
    : tone === "warning"
      ? <AlertTriangle aria-hidden className="mt-1 size-4 shrink-0 text-warning" />
      : <XCircle aria-hidden className="mt-1 size-4 shrink-0 text-destructive" />;
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {values.length ? (
          <ul className="grid gap-2">{values.map((value) => <li key={value} className="flex gap-2 text-sm leading-6">{icon}{value}</li>)}</ul>
        ) : <p className="text-sm text-muted-foreground">{empty}</p>}
      </CardContent>
    </Card>
  );
}

function EvidenceMatrix({ rows }: { rows: EvidenceMatrixRow[] }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Evidence matrix</CardTitle>
        <CardDescription>Every confirmed requirement mapped to visible candidate evidence and verification state.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <Table scrollLabel="Job requirements and candidate evidence">
            <TableCaption>Evidence comes from the selected resume, canonical profile, and confirmed preferences.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-52">Requirement</TableHead>
                <TableHead>Strength</TableHead>
                <TableHead className="min-w-72">Candidate evidence</TableHead>
                <TableHead className="min-w-64">Suggested action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-normal align-top">
                    <p className="font-medium leading-5">{row.requirement}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{humanize(row.requirementType)} · {Math.round(row.confidence * 100)}% confidence</p>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge
                      variant={row.strength === "none" ? "destructive" : "outline"}
                      className={cn(
                        row.strength === "strong" && "border-success/40 text-success",
                        ["partial", "related", "unverified"].includes(row.strength) && "border-warning/40 text-warning",
                      )}
                    >
                      {STRENGTH_LABELS[row.strength]}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal align-top">
                    {row.evidenceSource.length ? (
                      <ul className="grid gap-2">
                        {row.evidenceSource.map((source) => (
                          <li key={row.id + "-" + source.type + "-" + source.id} className="text-sm">
                            <span className="font-medium">{source.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{source.verified ? "Verified" : "Unverified"}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <span className="text-muted-foreground">{row.missingEvidence || "No evidence"}</span>}
                  </TableCell>
                  <TableCell className="whitespace-normal align-top leading-6 text-muted-foreground">{row.suggestedAction}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="grid place-items-center gap-2 rounded-lg border border-dashed p-8 text-center">
            <GitCompareArrows aria-hidden className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No explicit requirements were extracted. Correct the job review and match again.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
