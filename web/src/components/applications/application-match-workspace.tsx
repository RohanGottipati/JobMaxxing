"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  GitCompareArrows,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  COVER_LETTER_TONES,
  CoverLetterGenerator,
} from "@/components/applications/cover-letter-generation";
import {
  parseResumeValue,
  requestJson,
  toFailure,
  toResumeValue,
  type BusyAction,
  type CoverLetterGeneration,
  type JobAnalysisView,
  type JobMatchView,
  type OperationFailure as Failure,
  type ResumeMatchOption,
  type TailoringRunView,
} from "@/components/applications/application-match-types";
import { JobAnalysisReview } from "@/components/applications/job-analysis-review";
import { JobMatchResults } from "@/components/applications/job-match-results";
import { TailoringReview } from "@/components/applications/tailoring-review";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { JobStructuredData } from "@/lib/job-intelligence/schemas";
import { cn } from "@/lib/utils";

export function ApplicationMatchWorkspace(props: {
  application: {
    id: string;
    companyName: string;
    jobTitle: string;
    jobUrl: string | null;
    jobDescription: string | null;
  };
  initialAnalysis: JobAnalysisView | null;
  initialMatches: JobMatchView[];
  resumeOptions: ResumeMatchOption[];
  initialTailoringRuns: TailoringRunView[];
  initialCoverLetters: CoverLetterGeneration[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState("job");
  const [analysis, setAnalysis] = useState(props.initialAnalysis);
  const [hasJobDescription, setHasJobDescription] = useState(
    Boolean(props.application.jobDescription),
  );
  const [jobDraft, setJobDraft] = useState<JobStructuredData | null>(
    props.initialAnalysis?.data ?? null,
  );
  const [matches, setMatches] = useState(props.initialMatches);
  const initialResume = props.initialMatches[0]
    ? props.initialMatches[0].resumeKind + ":" + props.initialMatches[0].resumeId
    : props.resumeOptions[0]
      ? toResumeValue(props.resumeOptions[0])
      : "";
  const [selectedResume, setSelectedResume] = useState(initialResume);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(
    props.initialMatches[0]?.id ?? null,
  );
  const [tailoringRuns, setTailoringRuns] = useState(props.initialTailoringRuns);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(
    props.initialTailoringRuns[0]?.id ?? null,
  );
  const initialRun = props.initialTailoringRuns[0];
  const [selectedChangeIds, setSelectedChangeIds] = useState<string[]>(
    initialRun ? selectedIdsForRun(initialRun) : [],
  );
  const [tailoredTitle, setTailoredTitle] = useState(
    props.application.companyName + " — " + props.application.jobTitle,
  );
  const initialLetter = props.initialCoverLetters[0];
  const [tone, setTone] = useState<keyof typeof COVER_LETTER_TONES>(
    initialLetter?.tone ?? "direct",
  );
  const [maxWords, setMaxWords] = useState<150 | 200 | 300>(
    initialLetter?.maxWords ?? 200,
  );
  const [coverLetters, setCoverLetters] = useState(props.initialCoverLetters);
  const [coverLetter, setCoverLetter] = useState<CoverLetterGeneration | null>(
    initialLetter ?? null,
  );
  const [busy, setBusy] = useState<BusyAction>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  const selectedMatch = matches.find((match) => match.id === selectedMatchId) ?? null;
  const selectedRun = tailoringRuns.find((run) => run.id === selectedRunId) ?? null;
  const jobConfirmed = analysis?.status === "confirmed";
  const appliedRun = tailoringRuns.some((run) => run.status === "applied");
  const progress =
    Number(Boolean(jobConfirmed)) +
    Number(Boolean(matches.length)) +
    Number(appliedRun) +
    Number(Boolean(coverLetter));

  function chooseResume(value: string) {
    setSelectedResume(value);
    const parsed = parseResumeValue(value);
    const latest = matches.find(
      (match) => match.resumeId === parsed.id && match.resumeKind === parsed.kind,
    );
    setSelectedMatchId(latest?.id ?? null);
  }

  function chooseRun(run: TailoringRunView) {
    setSelectedRunId(run.id);
    setSelectedChangeIds(selectedIdsForRun(run));
  }

  async function analyzeJob(sourceText?: string) {
    setBusy("analyze");
    setFailure(null);
    try {
      const next = await requestJson<JobAnalysisView>("/api/job-analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: props.application.id, sourceText }),
      });
      setAnalysis(next);
      setJobDraft(next.data);
      toast.success("Job description parsed — review before matching");
    } catch (error) {
      setFailure(toFailure(error));
    } finally {
      setBusy(null);
    }
  }

  async function importJobPage() {
    setBusy("import_job_url");
    setFailure(null);
    try {
      const imported = await requestJson<{
        adapter: string;
        description: string;
      }>("/api/job-imports/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: props.application.id }),
      });
      setBusy("analyze");
      const next = await requestJson<JobAnalysisView>("/api/job-analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: props.application.id,
          sourceText: imported.description,
        }),
      });
      setHasJobDescription(true);
      setAnalysis(next);
      setJobDraft(next.data);
      toast.success(`Imported from ${imported.adapter} — review every field before confirming`);
    } catch (error) {
      setFailure(toFailure(error));
    } finally {
      setBusy(null);
    }
  }

  async function confirmJob() {
    if (!analysis || !jobDraft) return;
    setBusy("confirm");
    setFailure(null);
    try {
      const next = await requestJson<JobAnalysisView>(
        "/api/job-analyses/" + analysis.id,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: jobDraft }),
        },
      );
      setAnalysis(next);
      setJobDraft(next.data);
      setTab("match");
      toast.success("Job facts confirmed");
    } catch (error) {
      setFailure(toFailure(error));
    } finally {
      setBusy(null);
    }
  }

  async function runMatch() {
    if (!selectedResume) return;
    const parsed = parseResumeValue(selectedResume);
    setBusy("match");
    setFailure(null);
    try {
      const next = await requestJson<JobMatchView>("/api/job-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: props.application.id,
          kind: parsed.kind,
          resumeId: parsed.id,
        }),
      });
      setMatches((current) => [next, ...current]);
      setSelectedMatchId(next.id);
      toast.success("Explainable match generated");
    } catch (error) {
      setFailure(toFailure(error));
    } finally {
      setBusy(null);
    }
  }

  async function createTailoring() {
    if (!selectedMatch || selectedMatch.resumeKind !== "master") return;
    setBusy("tailor");
    setFailure(null);
    try {
      const run = await requestJson<TailoringRunView>("/api/tailoring-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: props.application.id,
          sourceResumeId: selectedMatch.resumeId,
          jobMatchId: selectedMatch.id,
        }),
      });
      setTailoringRuns((current) => [run, ...current]);
      chooseRun(run);
      setTab("tailor");
      toast.success("Tailoring diff is ready for review");
    } catch (error) {
      setFailure(toFailure(error));
    } finally {
      setBusy(null);
    }
  }

  async function applyTailoring() {
    if (!selectedRun) return;
    setBusy("apply");
    setFailure(null);
    try {
      const result = await requestJson<{ resumeVersionId: string }>(
        "/api/tailoring-runs/" + selectedRun.id + "/apply",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedChangeIds,
            title: tailoredTitle,
          }),
        },
      );
      setTailoringRuns((current) =>
        current.map((run) =>
          run.id === selectedRun.id
            ? {
                ...run,
                status: "applied",
                acceptedChangeIds: selectedChangeIds,
                outputResumeVersionId: result.resumeVersionId,
              }
            : run,
        ),
      );
      toast.success("Separate tailored resume created");
      router.refresh();
    } catch (error) {
      setFailure(toFailure(error));
    } finally {
      setBusy(null);
    }
  }

  async function generateCoverLetter() {
    if (!selectedResume) return;
    const parsed = parseResumeValue(selectedResume);
    setBusy("cover_letter");
    setFailure(null);
    try {
      const result = await requestJson<CoverLetterGeneration>(
        "/api/cover-letters/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId: props.application.id,
            kind: parsed.kind,
            resumeId: parsed.id,
            tone,
            maxWords,
          }),
        },
      );
      setCoverLetter(result);
      setCoverLetters((current) => [result, ...current.filter((item) => item.id !== result.id)]);
      toast.success("Grounded cover letter saved");
      router.refresh();
    } catch (error) {
      setFailure(toFailure(error));
    } finally {
      setBusy(null);
    }
  }

  async function transformCurrentCoverLetter(
    action: "regenerate_paragraph" | "shorten" | "expand",
    paragraphIndex?: number,
  ) {
    if (!coverLetter) return;
    const shorter = coverLetter.maxWords === 300 ? 200 : 150;
    const longer = coverLetter.maxWords === 150 ? 200 : 300;
    setBusy("cover_letter_transform");
    setFailure(null);
    try {
      const result = await requestJson<CoverLetterGeneration>(
        `/api/cover-letters/${coverLetter.id}/transform`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            paragraphIndex,
            maxWords: action === "shorten" ? shorter : action === "expand" ? longer : undefined,
          }),
        },
      );
      setCoverLetter(result);
      setTone(result.tone);
      setMaxWords(result.maxWords);
      setCoverLetters((current) => [result, ...current.filter((item) => item.id !== result.id)]);
      toast.success(
        action === "regenerate_paragraph"
          ? "Grounded paragraph saved as a new version"
          : action === "shorten"
            ? "Shorter letter saved as a new version"
            : "Expanded letter saved as a new version",
      );
      router.refresh();
    } catch (error) {
      setFailure(toFailure(error));
    } finally {
      setBusy(null);
    }
  }

  async function copyCoverLetter() {
    if (!coverLetter) return;
    try {
      await navigator.clipboard.writeText(coverLetter.content);
      toast.success("Cover letter copied");
    } catch {
      toast.error("Clipboard access was unavailable. Open the editor to copy it.");
    }
  }

  return (
    <div className="grid min-w-0 gap-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            href={"/applications/" + props.application.id}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 mb-2 text-muted-foreground",
            )}
          >
            <ArrowLeft aria-hidden />
            Back to application
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">Career match</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Review {props.application.jobTitle} at {props.application.companyName}, compare verified evidence, and create application-specific materials without changing your base resume.
          </p>
        </div>
        <Badge variant="outline" className="h-7 px-3 tabular-nums">{progress} of 4 ready</Badge>
      </header>

      <WorkflowProgress
        analysis={analysis}
        hasMatch={Boolean(matches.length)}
        hasTailored={appliedRun}
        hasLetter={Boolean(coverLetter)}
      />

      {failure ? <FailureAlert failure={failure} onDismiss={() => setFailure(null)} /> : null}

      <Tabs value={tab} onValueChange={setTab} className="min-w-0">
        <TabsList className="w-full justify-start overflow-x-auto overscroll-x-contain">
          <TabsTrigger value="job">1. Job review</TabsTrigger>
          <TabsTrigger value="match" disabled={!jobConfirmed}>2. Match</TabsTrigger>
          <TabsTrigger value="tailor" disabled={!matches.length}>3. Tailor</TabsTrigger>
          <TabsTrigger value="letter" disabled={!jobConfirmed}>4. Cover letter</TabsTrigger>
        </TabsList>

        <TabsContent value="job" className="grid gap-5">
          {!hasJobDescription ? (
            <Alert variant={props.application.jobUrl ? "default" : "destructive"}>
              <FileText aria-hidden />
              <AlertTitle>A job description is required</AlertTitle>
              <AlertDescription>
                {props.application.jobUrl
                  ? "Import the saved supported job URL, or paste the description manually. Imported text is previewed as unconfirmed data. "
                  : "Add the original description before parsing. "}
                The saved snapshot remains available if the posting disappears.{" "}
                <Link href={"/applications/" + props.application.id + "/edit"}>Edit application</Link>
              </AlertDescription>
            </Alert>
          ) : null}
          {!analysis || !jobDraft ? (
            <EmptyPanel
              icon={<Target aria-hidden />}
              title="No job analysis yet"
              description="Parse the saved description into requirements, compensation, dates, location, and work-authorization facts. Nothing is confirmed until you review it."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {hasJobDescription ? (
                    <Button onClick={() => void analyzeJob()} disabled={busy !== null}>
                      {busy === "analyze" ? <Loader2 aria-hidden className="animate-spin" /> : <Sparkles aria-hidden />}
                      Parse saved description
                    </Button>
                  ) : null}
                  {props.application.jobUrl ? (
                    <Button variant={hasJobDescription ? "outline" : "default"} onClick={() => void importJobPage()} disabled={busy !== null}>
                      {busy === "import_job_url" || busy === "analyze" ? <Loader2 aria-hidden className="animate-spin" /> : <FileText aria-hidden />}
                      Import saved job URL
                    </Button>
                  ) : null}
                </div>
              }
            />
          ) : (
            <JobAnalysisReview
              key={analysis.id}
              analysis={analysis}
              data={jobDraft}
              busy={busy}
              onChange={setJobDraft}
              onConfirm={() => void confirmJob()}
              onAnalyze={() => void analyzeJob()}
            />
          )}
        </TabsContent>

        <TabsContent value="match" className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Choose a structured resume</CardTitle>
              <CardDescription>Matching uses evidence visible in this version plus your canonical profile. It is guidance, not a hiring prediction.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
              {props.resumeOptions.length ? (
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <Label htmlFor="match-resume">Resume</Label>
                  <Select id="match-resume" value={selectedResume} onChange={(event) => chooseResume(event.target.value)}>
                    {props.resumeOptions.map((option) => (
                      <option key={toResumeValue(option)} value={toResumeValue(option)}>
                        {option.kind === "master" ? "Master · " : "Tailored · "}{option.label}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : (
                <Alert className="flex-1">
                  <FileText aria-hidden />
                  <AlertTitle>No structured resume available</AlertTitle>
                  <AlertDescription><Link href="/resumes/new">Create a structured master resume</Link> before matching.</AlertDescription>
                </Alert>
              )}
              <Button onClick={() => void runMatch()} disabled={!selectedResume || busy !== null}>
                {busy === "match" ? <Loader2 aria-hidden className="animate-spin" /> : selectedMatch ? <RefreshCw aria-hidden /> : <GitCompareArrows aria-hidden />}
                {selectedMatch ? "Run a new match" : "Generate match"}
              </Button>
            </CardContent>
          </Card>
          {busy === "match" && !selectedMatch ? (
            <MatchSkeleton />
          ) : selectedMatch ? (
            <JobMatchResults
              match={selectedMatch}
              matches={matches}
              onSelect={setSelectedMatchId}
              onTailor={() => void createTailoring()}
              tailoring={busy === "tailor"}
            />
          ) : (
            <EmptyPanel icon={<GitCompareArrows aria-hidden />} title="No match for this resume yet" description="Generate an evidence-weighted score to see strong matches, gaps, conflicts, and whether applying is still reasonable." />
          )}
        </TabsContent>

        <TabsContent value="tailor" className="grid gap-5">
          {!selectedMatch ? (
            <EmptyPanel icon={<WandSparkles aria-hidden />} title="Select a match first" description="Tailoring starts from a specific confirmed job and resume comparison." />
          ) : selectedMatch.resumeKind !== "master" ? (
            <Alert>
              <ShieldCheck aria-hidden />
              <AlertTitle>Choose a master resume to create a new version</AlertTitle>
              <AlertDescription>
                Existing tailored resumes can be scored, but safe tailoring branches from a master so submitted or application-specific documents are never overwritten.
              </AlertDescription>
            </Alert>
          ) : selectedMatch.isStale ? (
            <Alert>
              <AlertTriangle aria-hidden />
              <AlertTitle>Run a fresh match before tailoring</AlertTitle>
              <AlertDescription>
                The saved comparison predates a change to the job review, career profile, or source resume.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Tailoring review</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Every change is optional. Unsupported claims are blocked and locked facts stay untouched.</p>
                </div>
                <Button variant="outline" onClick={() => void createTailoring()} disabled={busy !== null}>
                  {busy === "tailor" ? <Loader2 aria-hidden className="animate-spin" /> : <RefreshCw aria-hidden />}
                  Generate new diff
                </Button>
              </div>
              {selectedRun ? (
                <TailoringReview
                  run={selectedRun}
                  runs={tailoringRuns}
                  selectedIds={selectedChangeIds}
                  title={tailoredTitle}
                  applying={busy === "apply"}
                  onSelectRun={(id) => {
                    const run = tailoringRuns.find((item) => item.id === id);
                    if (run) chooseRun(run);
                  }}
                  onToggle={(id, checked) =>
                    setSelectedChangeIds((current) =>
                      checked ? [...new Set([...current, id])] : current.filter((item) => item !== id),
                    )
                  }
                  onSelectionChange={setSelectedChangeIds}
                  onTitleChange={setTailoredTitle}
                  onApply={() => void applyTailoring()}
                />
              ) : (
                <EmptyPanel
                  icon={<WandSparkles aria-hidden />}
                  title="No tailoring diff yet"
                  description="Review safe section and bullet prioritization before creating a separate version."
                  action={
                    <Button onClick={() => void createTailoring()} disabled={busy !== null}>
                      {busy === "tailor" ? <Loader2 aria-hidden className="animate-spin" /> : <WandSparkles aria-hidden />}
                      Build tailoring diff
                    </Button>
                  }
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="letter" className="grid gap-5">
          <CoverLetterGenerator
            resumeOptions={props.resumeOptions}
            selectedResume={selectedResume}
            tone={tone}
            maxWords={maxWords}
            letter={coverLetter}
            history={coverLetters}
            busy={busy}
            onResumeChange={chooseResume}
            onToneChange={setTone}
            onMaxWordsChange={setMaxWords}
            onGenerate={() => void generateCoverLetter()}
            onCopy={() => void copyCoverLetter()}
            onTransform={(action, paragraphIndex) =>
              void transformCurrentCoverLetter(action, paragraphIndex)
            }
            onSelectVersion={(id) => {
              const next = coverLetters.find((item) => item.id === id);
              if (!next) return;
              setCoverLetter(next);
              setTone(next.tone);
              setMaxWords(next.maxWords);
            }}
          />
        </TabsContent>
      </Tabs>

      {busy ? <p className="sr-only" role="status" aria-live="polite">{busyStatus(busy)}</p> : null}
    </div>
  );
}

function selectedIdsForRun(run: TailoringRunView) {
  return run.status === "applied"
    ? run.acceptedChangeIds
    : run.changes
        .filter((change) => change.defaultSelected && !change.unsupportedClaims.length)
        .map((change) => change.id);
}

function WorkflowProgress({
  analysis,
  hasMatch,
  hasTailored,
  hasLetter,
}: {
  analysis: JobAnalysisView | null;
  hasMatch: boolean;
  hasTailored: boolean;
  hasLetter: boolean;
}) {
  const steps = [
    { label: "Job confirmed", complete: analysis?.status === "confirmed", active: Boolean(analysis && analysis.status !== "confirmed") },
    { label: "Match explained", complete: hasMatch, active: false },
    { label: "Resume tailored", complete: hasTailored, active: false },
    { label: "Letter saved", complete: hasLetter, active: false },
  ];
  return (
    <Card size="sm">
      <CardContent>
        <ol className="grid gap-2 sm:grid-cols-4" aria-label="Application preparation progress">
          {steps.map((step, index) => (
            <li key={step.label} className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/35 px-3 py-2">
              <span className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                step.complete
                  ? "border-success/30 bg-success/10 text-success"
                  : step.active
                    ? "border-warning/40 bg-warning/10 text-warning"
                    : "border-border bg-background text-muted-foreground",
              )}>
                {step.complete ? <CheckCircle2 aria-hidden className="size-3.5" /> : index + 1}
              </span>
              <span className="truncate text-xs font-medium">{step.label}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function FailureAlert({
  failure,
  onDismiss,
}: {
  failure: Failure;
  onDismiss: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertTriangle aria-hidden />
      <AlertTitle>
        {failure.code === "RATE_LIMITED"
          ? "Daily limit reached"
          : failure.code === "FORBIDDEN"
            ? "Permission or consent required"
            : failure.code === "OFFLINE"
              ? "You are offline"
              : "Operation failed"}
      </AlertTitle>
      <AlertDescription>
        <p>{failure.message}</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {failure.code === "FORBIDDEN" ? <Link href="/profile">Review AI consent</Link> : null}
          <button type="button" className="font-medium underline underline-offset-4" onClick={onDismiss}>Dismiss</button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

function EmptyPanel({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="grid place-items-center gap-3 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary [&_svg]:size-5">{icon}</span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

function MatchSkeleton() {
  return (
    <div className="grid gap-4" aria-live="polite">
      <div className="h-44 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 aria-hidden className="animate-spin" />Mapping requirements to verified evidence…</p>
    </div>
  );
}

function busyStatus(busy: Exclude<BusyAction, null>) {
  return {
    import_job_url: "Importing the saved job page",
    analyze: "Parsing the job description",
    confirm: "Saving confirmed job fields",
    match: "Calculating the job match",
    tailor: "Building tailoring suggestions",
    apply: "Creating the tailored resume",
    cover_letter: "Generating the cover letter",
    cover_letter_transform: "Saving a grounded cover letter revision",
  }[busy];
}
