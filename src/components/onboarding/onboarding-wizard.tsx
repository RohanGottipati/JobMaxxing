"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, FileUp, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  completeOnboardingAction,
  deferOnboardingAction,
  markResumeStepAction,
  saveSetupAction,
} from "@/app/(onboarding)/onboarding/actions";
import { Brand } from "@/components/layout/brand";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import type { getOnboardingState } from "@/lib/onboarding/repository";

type InitialState = Awaited<ReturnType<typeof getOnboardingState>>;

function splitList(value: string) {
  return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))].slice(0, 20);
}

export function OnboardingWizard({ initial }: { initial: InitialState }) {
  const router = useRouter();
  const initialStep = initial.profile.onboarding_step >= 3 ? 3 : initial.profile.onboarding_step >= 2 ? 2 : 1;
  const [step, setStep] = useState(initialStep);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState(initial.profile.full_name ?? "");
  const [headline, setHeadline] = useState(initial.profile.headline ?? "");
  const [careerStage, setCareerStage] = useState(initial.profile.career_stage ?? "early_career");
  const [roles, setRoles] = useState(initial.preferences?.target_roles.join(", ") ?? "");
  const [locations, setLocations] = useState(initial.preferences?.preferred_locations.join(", ") ?? "");
  const [arrangements, setArrangements] = useState<string[]>(initial.preferences?.work_arrangements ?? []);
  const [aiConsent, setAiConsent] = useState(Boolean(initial.profile.ai_processing_consent_at));

  function run(task: () => Promise<{ ok: boolean; message?: string; nextStep?: number }>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await task();
        if (!result.ok) return setError(result.message ?? "Could not save this step.");
        if (result.nextStep) setStep(result.nextStep);
      } catch {
        setError("Could not save this step. Check your connection and try again.");
      }
    });
  }

  function finishLater() {
    startTransition(async () => {
      await deferOnboardingAction(step);
      toast.success("Your progress is saved.");
      router.push("/dashboard");
      router.refresh();
    });
  }

  function complete() {
    startTransition(async () => {
      await completeOnboardingAction(aiConsent);
      toast.success("Your workspace is ready.");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-3xl flex-col sm:min-h-[calc(100dvh-5rem)]">
      <div className="flex items-center justify-between gap-4">
        <Brand href="/" />
        <Button variant="ghost" size="sm" onClick={finishLater} disabled={pending}>Finish later</Button>
      </div>
      <div className="mt-6 grid gap-2">
        <div className="flex justify-between text-xs text-muted-foreground"><span>Step {step} of 3</span><span>{Math.round((step / 3) * 100)}%</span></div>
        <Progress value={(step / 3) * 100} />
      </div>

      <Card className="my-5 min-h-0 flex-1 overflow-hidden">
        <CardContent className="grid gap-5 p-5 sm:p-7">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.03em]">
              {step === 1 ? "Tell us what you’re looking for" : step === 2 ? "Add a resume" : "One last choice"}
            </h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {step === 1 ? "This sets up your profile and makes matching more useful." : step === 2 ? "Import one now, build one here, or skip it." : "Choose whether JobMaxxing can use AI features. You can change this later."}
            </p>
          </div>

          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}

          {step === 1 ? (
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" id="onboarding-name"><Input id="onboarding-name" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" /></Field>
                <Field label="Career stage" id="onboarding-stage"><Select id="onboarding-stage" value={careerStage} onChange={(event) => setCareerStage(event.target.value)}><option value="student">Student</option><option value="new_grad">New graduate</option><option value="early_career">Early career</option><option value="mid_career">Mid career</option><option value="senior">Senior individual contributor</option><option value="manager">Manager</option><option value="executive">Executive</option><option value="career_change">Career change</option></Select></Field>
              </div>
              <Field label="Headline (optional)" id="onboarding-headline"><Input id="onboarding-headline" value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="Computer Science student focused on full-stack development" /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Target roles" id="onboarding-roles"><Input id="onboarding-roles" value={roles} onChange={(event) => setRoles(event.target.value)} placeholder="Software engineer, platform engineer" /><p className="text-xs text-muted-foreground">Separate roles with commas.</p></Field>
                <Field label="Preferred locations (optional)" id="onboarding-locations"><Input id="onboarding-locations" value={locations} onChange={(event) => setLocations(event.target.value)} placeholder="Toronto, Waterloo, Remote" /></Field>
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Work setup (optional)</legend>
                <div className="flex flex-wrap gap-2">
                  {[["remote", "Remote"], ["hybrid", "Hybrid"], ["onsite", "On-site"]].map(([value, label]) => (
                    <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                      <Checkbox checked={arrangements.includes(value)} onCheckedChange={(checked) => setArrangements((current) => checked ? [...new Set([...current, value])] : current.filter((item) => item !== value))} />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/resumes/import?return=onboarding" className="rounded-xl border border-primary/35 bg-primary/[0.04] p-5 transition-colors hover:bg-primary/[0.07]">
                <FileUp aria-hidden className="size-5 text-primary" />
                <h2 className="mt-4 font-semibold">Import a resume</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Upload a PDF or DOCX and review what was extracted before saving.</p>
              </Link>
              <Link href="/resumes/new?return=onboarding" className="rounded-xl border border-border p-5 transition-colors hover:bg-muted/40">
                <FileUp aria-hidden className="size-5 text-muted-foreground" />
                <h2 className="mt-4 font-semibold">Build one here</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Start with the structured editor and export when you’re ready.</p>
              </Link>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-parchment/30 p-4">
                <Checkbox checked={aiConsent} onCheckedChange={(checked) => setAiConsent(checked === true)} />
                <span>
                  <span className="block text-sm font-medium">Enable AI-assisted features</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">Allows resume parsing, job analysis, matching, tailoring and Maxwell to send relevant text to Gemini. Core tracking works without it.</span>
                </span>
              </label>
              <div className="rounded-lg border border-border px-4 py-3 text-sm">
                <p className="font-medium">Your setup</p>
                <p className="mt-1 text-muted-foreground">{splitList(roles).join(", ") || "No target roles"}{splitList(locations).length ? ` · ${splitList(locations).join(", ")}` : ""}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-auto flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-between">
            <Button variant="ghost" disabled={pending || step === 1} onClick={() => setStep((value) => Math.max(1, value - 1))}><ArrowLeft aria-hidden />Back</Button>
            {step === 1 ? <Button disabled={pending} onClick={() => run(() => saveSetupAction({ fullName, headline, careerStage, targetRoles: splitList(roles), preferredLocations: splitList(locations), workArrangements: arrangements }))}>{pending ? <Loader2 aria-hidden className="animate-spin" /> : null}Continue<ArrowRight aria-hidden /></Button> : null}
            {step === 2 ? <Button disabled={pending} onClick={() => run(markResumeStepAction)}>Skip for now<ArrowRight aria-hidden /></Button> : null}
            {step === 3 ? <Button disabled={pending} onClick={complete}>{pending ? <Loader2 aria-hidden className="animate-spin" /> : <Check aria-hidden />}Open JobMaxxing</Button> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>;
}
