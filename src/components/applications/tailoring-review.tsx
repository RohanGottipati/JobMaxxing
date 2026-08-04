"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, Loader2, ShieldCheck, WandSparkles } from "lucide-react";

import type { TailoringRunView } from "@/components/applications/application-match-types";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function TailoringReview({
  run,
  runs,
  selectedIds,
  title,
  applying,
  onSelectRun,
  onToggle,
  onSelectionChange,
  onTitleChange,
  onApply,
}: {
  run: TailoringRunView;
  runs: TailoringRunView[];
  selectedIds: string[];
  title: string;
  applying: boolean;
  onSelectRun: (id: string) => void;
  onToggle: (id: string, checked: boolean) => void;
  onSelectionChange: (ids: string[]) => void;
  onTitleChange: (value: string) => void;
  onApply: () => void;
}) {
  const safeChanges = run.changes.filter((change) => !change.unsupportedClaims.length);
  const selectedCount = safeChanges.filter((change) => selectedIds.includes(change.id)).length;
  const groups = [...new Set(safeChanges.map((change) => change.type))].map((type) => {
    const ids = safeChanges.filter((change) => change.type === type).map((change) => change.id);
    return { type, ids, allSelected: ids.every((id) => selectedIds.includes(id)) };
  });

  function toggleGroup(ids: string[], select: boolean) {
    const groupIds = new Set(ids);
    onSelectionChange(
      select
        ? [...new Set([...selectedIds, ...ids])]
        : selectedIds.filter((id) => !groupIds.has(id)),
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <Card className="min-w-0">
        <CardHeader className="border-b border-border bg-parchment/35">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Review every change</CardTitle>
              <CardDescription>{selectedCount} of {safeChanges.length} safe suggestions selected</CardDescription>
            </div>
            {runs.length > 1 ? (
              <Select aria-label="Tailoring run history" className="w-full sm:w-60" value={run.id} onChange={(event) => onSelectRun(event.target.value)}>
                {runs.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.status} · {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}
                  </option>
                ))}
              </Select>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {safeChanges.length && run.status !== "applied" ? (
            <fieldset className="mb-4 rounded-lg border border-border bg-muted/20 p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Safe change groups
              </legend>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectionChange(safeChanges.map((change) => change.id))}
                  disabled={selectedCount === safeChanges.length}
                >
                  Select all safe
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectionChange([])}
                  disabled={selectedCount === 0}
                >
                  Clear selection
                </Button>
                {groups.map((group) => (
                  <Button
                    key={group.type}
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-pressed={group.allSelected}
                    onClick={() => toggleGroup(group.ids, !group.allSelected)}
                  >
                    {group.allSelected ? "Clear " : "Select "}{humanize(group.type)} ({group.ids.length})
                  </Button>
                ))}
              </div>
            </fieldset>
          ) : null}
          {run.changes.length ? (
            <ul className="grid gap-3">
              {run.changes.map((change) => {
                const blocked = Boolean(change.unsupportedClaims.length);
                const checked = selectedIds.includes(change.id) && !blocked;
                const requirements = run.evidenceMatrix.filter((row) =>
                  change.evidenceRequirementIds.includes(row.id),
                );
                return (
                  <li
                    key={change.id}
                    className={cn(
                      "grid gap-3 rounded-lg border border-border p-4",
                      checked && "border-primary/35 bg-primary/[0.035]",
                      blocked && "border-destructive/30 bg-destructive/[0.03]",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={checked}
                        disabled={blocked || run.status === "applied"}
                        aria-label={(checked ? "Reject " : "Accept ") + change.label}
                        onCheckedChange={(next) => onToggle(change.id, next)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{change.label}</p>
                          <Badge variant="outline">{humanize(change.type)}</Badge>
                          {change.confidence !== undefined ? (
                            <Badge variant="outline">{Math.round(change.confidence * 100)}% confidence</Badge>
                          ) : null}
                          {change.model ? <Badge variant="secondary">AI grounded</Badge> : null}
                          {blocked ? <Badge variant="destructive">Blocked</Badge> : null}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{change.reason}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DiffValue label="Before" value={change.before} />
                      <DiffValue label="After" value={change.after} />
                    </div>
                    {requirements.length || change.factsUsed?.length ? (
                      <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 text-xs leading-5 sm:grid-cols-2">
                        <div>
                          <p className="font-semibold uppercase tracking-wide text-muted-foreground">Job evidence links</p>
                          {requirements.length ? (
                            <ul className="mt-1 grid gap-1">
                              {requirements.map((row) => <li key={row.id}>{row.requirement}</li>)}
                            </ul>
                          ) : <p className="mt-1 text-muted-foreground">No direct requirement link.</p>}
                        </div>
                        <div>
                          <p className="font-semibold uppercase tracking-wide text-muted-foreground">Candidate facts used</p>
                          {change.factsUsed?.length ? (
                            <ul className="mt-1 grid gap-1">
                              {change.factsUsed.map((fact, index) => <li key={fact + index}>{fact}</li>)}
                            </ul>
                          ) : <p className="mt-1 text-muted-foreground">Existing ordering or visibility only.</p>}
                        </div>
                      </div>
                    ) : null}
                    {change.skillsAdded?.length || change.metricsAdded?.length ? (
                      <p className="text-xs leading-5 text-muted-foreground">
                        Declared additions: {[...(change.skillsAdded ?? []), ...(change.metricsAdded ?? [])].join(" · ")}
                      </p>
                    ) : null}
                    {change.unsupportedClaims.length ? (
                      <Alert variant="destructive">
                        <AlertTriangle aria-hidden />
                        <AlertTitle>Unsupported additions</AlertTitle>
                        <AlertDescription>{change.unsupportedClaims.join(" · ")}</AlertDescription>
                      </Alert>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Alert>
              <CheckCircle2 aria-hidden />
              <AlertTitle>No safe changes were needed</AlertTitle>
              <AlertDescription>
                You can still create an application-specific copy, or edit verified content manually.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <aside className="grid content-start gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Create separate version</CardTitle>
            <CardDescription>
              The base resume is never overwritten. A stale diff is rejected if its source changed.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="tailored-title">Resume name</Label>
              <Input id="tailored-title" value={title} onChange={(event) => onTitleChange(event.target.value)} disabled={run.status === "applied"} maxLength={200} />
            </div>
            {run.status === "applied" && run.outputResumeVersionId ? (
              <Button asChild>
                <Link href={"/resumes/versions/" + run.outputResumeVersionId}>
                  <FileText aria-hidden />
                  Open tailored resume
                </Link>
              </Button>
            ) : (
              <Button onClick={onApply} disabled={applying || !title.trim()}>
                {applying ? <Loader2 aria-hidden className="animate-spin" /> : <WandSparkles aria-hidden />}
                Create tailored version
              </Button>
            )}
            <p className="text-xs leading-5 text-muted-foreground">
              {selectedCount} changes will be applied. Unselected and blocked suggestions stay only in the audit record.
            </p>
          </CardContent>
        </Card>
        <Alert>
          <ShieldCheck aria-hidden />
          <AlertTitle>Grounding guarantee</AlertTitle>
          <AlertDescription>
            Tailoring only changes existing evidence. Suggestions with unsupported claims are disabled and excluded.
          </AlertDescription>
        </Alert>
      </aside>
    </div>
  );
}

function DiffValue({
  label,
  value,
}: {
  label: string;
  value: string | boolean | string[];
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-muted/25 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {Array.isArray(value) ? (
        <ol className="mt-2 grid gap-1 text-xs leading-5">
          {value.map((item, index) => <li key={item + "-" + index} className="break-all">{index + 1}. {item}</li>)}
        </ol>
      ) : (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{String(value)}</p>
      )}
    </div>
  );
}
