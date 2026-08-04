"use client";

import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";

import type {
  BusyAction,
  JobAnalysisView,
} from "@/components/applications/application-match-types";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { JobStructuredData } from "@/lib/job-intelligence/schemas";
import { cn } from "@/lib/utils";

export function JobAnalysisReview({
  analysis,
  data,
  busy,
  onChange,
  onConfirm,
  onAnalyze,
}: {
  analysis: JobAnalysisView;
  data: JobStructuredData;
  busy: BusyAction;
  onChange: (data: JobStructuredData) => void;
  onConfirm: () => void;
  onAnalyze: () => void;
}) {
  const [listRevision, setListRevision] = useState(0);
  const setField = <K extends keyof JobStructuredData>(
    key: K,
    value: JobStructuredData[K],
  ) => onChange({ ...data, [key]: value });

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <Card className="min-w-0">
        <CardHeader className="border-b border-border bg-parchment/35">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Review parsed job fields</CardTitle>
              <CardDescription>
                Correct uncertain fields before they affect matching or generated documents.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={analysis.status === "confirmed" ? "secondary" : "outline"}>
                {analysis.status === "confirmed" ? "Confirmed" : "Review required"}
              </Badge>
              <Badge variant="outline">
                {analysis.parser === "hybrid" ? "AI + deterministic" : "Deterministic parser"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <ReviewField id="job-company" label="Company" confidence={analysis.fieldConfidence.company}>
                <Input id="job-company" value={data.company} onChange={(event) => setField("company", event.target.value)} required />
              </ReviewField>
              <ReviewField id="job-role-title" label="Role title" confidence={analysis.fieldConfidence.roleTitle}>
                <Input id="job-role-title" value={data.roleTitle} onChange={(event) => setField("roleTitle", event.target.value)} required />
              </ReviewField>
              <ReviewField id="job-seniority" label="Seniority" confidence={analysis.fieldConfidence.seniority}>
                <Select id="job-seniority" value={data.seniority} onChange={(event) => setField("seniority", event.target.value as JobStructuredData["seniority"])}>
                  {["intern", "entry", "mid", "senior", "staff", "principal", "manager", "director", "executive", "unknown"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
                </Select>
              </ReviewField>
              <ReviewField id="job-location" label="Location" confidence={analysis.fieldConfidence.location}>
                <Input id="job-location" value={data.location} onChange={(event) => setField("location", event.target.value)} />
              </ReviewField>
              <ReviewField id="job-arrangement" label="Work arrangement" confidence={analysis.fieldConfidence.workArrangement}>
                <Select id="job-arrangement" value={data.workArrangement} onChange={(event) => setField("workArrangement", event.target.value as JobStructuredData["workArrangement"])}>
                  {["remote", "hybrid", "onsite", "unknown"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
                </Select>
              </ReviewField>
              <ReviewField id="job-category" label="Role category" confidence={analysis.fieldConfidence.roleCategory}>
                <Input id="job-category" value={data.roleCategory} onChange={(event) => setField("roleCategory", event.target.value)} />
              </ReviewField>
              <ReviewField id="job-industry" label="Industry" confidence={analysis.fieldConfidence.industry}>
                <Input id="job-industry" value={data.industry} onChange={(event) => setField("industry", event.target.value)} />
              </ReviewField>
              <ReviewField id="job-posting-date" label="Posting date" confidence={analysis.fieldConfidence.postingDate}>
                <Input id="job-posting-date" value={data.postingDate} onChange={(event) => setField("postingDate", event.target.value)} placeholder="YYYY-MM-DD when known" />
              </ReviewField>
              <ReviewField id="job-deadline" label="Application deadline" confidence={analysis.fieldConfidence.applicationDeadline}>
                <Input id="job-deadline" value={data.applicationDeadline} onChange={(event) => setField("applicationDeadline", event.target.value)} placeholder="YYYY-MM-DD when known" />
              </ReviewField>
            </div>

            <fieldset className="grid gap-3 rounded-lg border border-border p-4">
              <legend className="px-1 text-sm font-semibold">Experience requirement</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField id="years-min" label="Minimum years" value={data.yearsExperience.min} max={50} onChange={(min) => setField("yearsExperience", { ...data.yearsExperience, min })} />
                <NumberField id="years-max" label="Maximum years" value={data.yearsExperience.max} max={50} onChange={(max) => setField("yearsExperience", { ...data.yearsExperience, max })} />
              </div>
            </fieldset>

            <fieldset className="grid gap-3 rounded-lg border border-border p-4">
              <legend className="px-1 text-sm font-semibold">Compensation</legend>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="comp-currency">Currency</Label>
                  <Select id="comp-currency" value={data.compensation.currency ?? ""} onChange={(event) => setField("compensation", { ...data.compensation, currency: event.target.value || null })}>
                    <option value="">Unknown</option>
                    {["USD", "CAD", "EUR", "GBP"].map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                  </Select>
                </div>
                <NumberField id="comp-min" label="Minimum" value={data.compensation.min} max={100000000} onChange={(min) => setField("compensation", { ...data.compensation, min })} />
                <NumberField id="comp-max" label="Maximum" value={data.compensation.max} max={100000000} onChange={(max) => setField("compensation", { ...data.compensation, max })} />
                <div className="grid gap-1.5">
                  <Label htmlFor="comp-period">Period</Label>
                  <Select id="comp-period" value={data.compensation.period ?? ""} onChange={(event) => setField("compensation", { ...data.compensation, period: (event.target.value as "hour" | "month" | "year") || null })}>
                    <option value="">Unknown</option>
                    <option value="hour">Hourly</option>
                    <option value="month">Monthly</option>
                    <option value="year">Annual</option>
                  </Select>
                </div>
              </div>
            </fieldset>

            <div className="grid gap-4 lg:grid-cols-2">
              <ListField key={`responsibilities-${analysis.updatedAt}-${listRevision}`} label="Responsibilities" field="responsibilities" confidence={analysis.fieldConfidence.responsibilities} values={data.responsibilities} onChange={(values) => setField("responsibilities", values)} />
              <ListField key={`required-skills-${analysis.updatedAt}-${listRevision}`} label="Required skills" field="requiredSkills" confidence={analysis.fieldConfidence.requiredSkills} values={data.requiredSkills} onChange={(values) => setField("requiredSkills", values)} />
              <ListField key={`preferred-skills-${analysis.updatedAt}-${listRevision}`} label="Preferred skills" field="preferredSkills" confidence={analysis.fieldConfidence.preferredSkills} values={data.preferredSkills} onChange={(values) => setField("preferredSkills", values)} />
              <ListField key={`education-${analysis.updatedAt}-${listRevision}`} label="Education requirements" field="educationRequirements" confidence={analysis.fieldConfidence.educationRequirements} values={data.educationRequirements} onChange={(values) => setField("educationRequirements", values)} />
              <ListField key={`authorization-${analysis.updatedAt}-${listRevision}`} label="Work-authorization requirements" field="workAuthorizationRequirements" confidence={analysis.fieldConfidence.workAuthorizationRequirements} values={data.workAuthorizationRequirements} onChange={(values) => setField("workAuthorizationRequirements", values)} />
              <ListField key={`benefits-${analysis.updatedAt}-${listRevision}`} label="Benefits" field="benefits" confidence={analysis.fieldConfidence.benefits} values={data.benefits} onChange={(values) => setField("benefits", values)} />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-between">
              <Button type="button" variant="outline" onClick={onAnalyze} disabled={busy !== null}>
                {busy === "analyze" ? <Loader2 aria-hidden className="animate-spin" /> : <RefreshCw aria-hidden />}
                Re-parse source
              </Button>
              <Button type="submit" disabled={busy !== null}>
                {busy === "confirm" ? <Loader2 aria-hidden className="animate-spin" /> : <ShieldCheck aria-hidden />}
                {analysis.status === "confirmed" ? "Save confirmed fields" : "Confirm and continue"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <aside className="grid content-start gap-5">
        {analysis.reanalysisDiff?.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Re-analysis suggestions</CardTitle>
              <CardDescription>
                Your confirmed values were preserved. Apply only parser changes you verify.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3">
                {analysis.reanalysisDiff.map((change) => {
                  const applied = JSON.stringify(data[change.field]) === JSON.stringify(change.after);
                  return (
                    <li key={change.field} className="rounded-lg border border-border p-3 text-xs leading-5">
                      <p className="font-semibold">{titleCase(change.field)}</p>
                      <dl className="mt-2 grid gap-2">
                        <div>
                          <dt className="text-muted-foreground">Confirmed</dt>
                          <dd className="break-words">{formatDiffValue(change.before)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">New parse</dt>
                          <dd className="break-words">{formatDiffValue(change.after)}</dd>
                        </div>
                      </dl>
                      <Button
                        className="mt-3"
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={applied || busy !== null}
                        onClick={() => {
                          onChange({
                            ...data,
                            [change.field]: change.after,
                          } as JobStructuredData);
                          setListRevision((current) => current + 1);
                        }}
                      >
                        {applied ? <CheckCircle2 aria-hidden /> : null}
                        {applied ? "Applied" : "Use parsed value"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ) : null}
        {analysis.warnings.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Needs attention</CardTitle>
              <CardDescription>Parser warnings are never silently treated as facts.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3">
                {analysis.warnings.map((warning) => (
                  <li key={warning} className="flex gap-2 text-sm leading-6">
                    <AlertTriangle aria-hidden className="mt-1 size-4 shrink-0 text-warning" />
                    {warning}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : (
          <Alert>
            <CheckCircle2 aria-hidden />
            <AlertTitle>No parser warnings</AlertTitle>
            <AlertDescription>Still verify the extracted facts against the original source.</AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Original snapshot</CardTitle>
            <CardDescription>Preserved independently of the live posting.</CardDescription>
          </CardHeader>
          <CardContent>
            <details>
              <summary className="cursor-pointer rounded-md text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">Read source description</summary>
              <div className="mt-3 max-h-[30rem] overflow-y-auto whitespace-pre-wrap rounded-lg border bg-parchment/35 p-3 text-xs leading-6 text-muted-foreground">
                {analysis.sourceTextSnapshot}
              </div>
            </details>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function ReviewField({
  id,
  label,
  confidence,
  children,
}: {
  id: string;
  label: string;
  confidence?: number;
  children: ReactNode;
}) {
  const uncertain = confidence !== undefined && confidence < 0.7;
  return (
    <div className={cn("grid gap-1.5 rounded-lg", uncertain && "border border-warning/35 bg-warning/5 p-3")}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {confidence !== undefined ? (
          <Badge variant={uncertain ? "destructive" : "outline"}>{Math.round(confidence * 100)}% confidence</Badge>
        ) : null}
      </div>
      {children}
      {uncertain ? <p className="text-xs text-warning">Verify this field against the source.</p> : null}
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number | null;
  max: number;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" min={0} max={max} value={value ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)} />
    </div>
  );
}

function ListField({
  label,
  field,
  confidence,
  values,
  onChange,
}: {
  label: string;
  field: string;
  confidence?: number;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [text, setText] = useState(values.join("\n"));
  const id = "job-" + field.replace(/[A-Z]/g, (match) => "-" + match.toLowerCase());
  return (
    <ReviewField id={id} label={label} confidence={confidence}>
      <Textarea
        id={id}
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          onChange(next.split("\n").map((value) => value.trim().replace(/^[-•*]\s*/, "")).filter(Boolean));
        }}
        className="min-h-32"
        placeholder="One item per line"
      />
      <p className="text-xs text-muted-foreground">One item per line.</p>
    </ReviewField>
  );
}

function titleCase(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDiffValue(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.join(" · ") : "None";
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${titleCase(key)}: ${item ?? "unknown"}`)
      .join(" · ");
  }
  if (typeof value === "string") return value || "Not provided";
  return String(value ?? "Not provided");
}
