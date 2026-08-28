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
  saveBasicsAction,
  savePreferencesAction,
  saveTargetsAction,
} from "@/app/(onboarding)/onboarding/actions";
import { Brand } from "@/components/layout/brand";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [step, setStep] = useState(Math.min(Math.max(initial.profile.onboarding_step, 1), 5));
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
      <div className="flex items-center justify-between gap-4"><Brand href="/" /><Button variant="ghost" size="sm" onClick={finishLater} disabled={pending}>Finish later</Button></div>
      <div className="mt-7 grid gap-2"><div className="flex justify-between text-xs text-muted-foreground"><span>Step {step} of 5</span><span>{step * 20}%</span></div><Progress value={step * 20} /></div>
      <Card className="my-6 min-h-0 flex-1 overflow-hidden">
        <CardHeader className="border-b border-border bg-parchment/35">
          <CardTitle>{["Build your foundation", "Bring your resume", "Choose your direction", "Set your preferences", "Review and finish"][step - 1]}</CardTitle>
          <CardDescription>{["Tell us where you are in your career.", "Import a resume now or return to it later.", "These roles shape future matching and recommendations.", "Choose the arrangements that work for you.", "You can change everything later from your profile."][step - 1]}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 p-5 sm:p-7">
          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          {step === 1 ? <>
            <Field label="Full name" id="onboarding-name"><Input id="onboarding-name" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" /></Field>
            <Field label="Professional headline" id="onboarding-headline"><Input id="onboarding-headline" value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="e.g. Backend engineer building reliable APIs" /></Field>
            <Field label="Career stage" id="onboarding-stage"><Select id="onboarding-stage" value={careerStage} onChange={(event) => setCareerStage(event.target.value)}><option value="student">Student</option><option value="new_grad">New graduate</option><option value="early_career">Early career</option><option value="mid_career">Mid career</option><option value="senior">Senior individual contributor</option><option value="manager">Manager</option><option value="executive">Executive</option><option value="career_change">Career change</option></Select></Field>
          </> : null}
          {step === 2 ? <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-primary/35"><CardHeader><FileUp aria-hidden className="size-5 text-primary" /><CardTitle className="text-base">Import PDF or DOCX</CardTitle><CardDescription>Review every parsed field before anything is saved.</CardDescription></CardHeader><CardContent><Button asChild className="w-full"><Link href="/resumes/import?return=onboarding">Import resume</Link></Button></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Create manually</CardTitle><CardDescription>Start from your career profile and an ATS-friendly template.</CardDescription></CardHeader><CardContent><Button asChild variant="outline" className="w-full"><Link href="/resumes/new?mode=structured&return=onboarding">Create resume</Link></Button></CardContent></Card>
          </div> : null}
          {step === 3 ? <><Field label="Target roles" id="onboarding-roles"><Input id="onboarding-roles" value={roles} onChange={(event) => setRoles(event.target.value)} placeholder="Backend engineer, platform engineer" /><p className="text-xs text-muted-foreground">Separate roles with commas.</p></Field><Field label="Preferred locations" id="onboarding-locations"><Input id="onboarding-locations" value={locations} onChange={(event) => setLocations(event.target.value)} placeholder="Toronto, New York, Remote" /></Field></> : null}
          {step === 4 ? <fieldset className="grid gap-3"><legend className="text-sm font-medium">Work arrangements</legend>{[["remote", "Remote"], ["hybrid", "Hybrid"], ["onsite", "Onsite"]].map(([value, label]) => <label key={value} className="flex min-h-11 items-center gap-3 rounded-lg border border-border p-3"><Checkbox checked={arrangements.includes(value)} onCheckedChange={(checked) => setArrangements((current) => checked ? [...new Set([...current, value])] : current.filter((item) => item !== value))} /><span>{label}</span></label>)}</fieldset> : null}
          {step === 5 ? <div className="grid gap-4"><Summary label="Profile" value={`${fullName}${headline ? ` · ${headline}` : ""}`} /><Summary label="Target roles" value={splitList(roles).join(", ") || "Not set"} /><Summary label="Locations" value={splitList(locations).join(", ") || "Flexible"} /><Summary label="Work arrangement" value={arrangements.join(", ") || "Flexible"} /><label className="flex items-start gap-3 rounded-lg border border-border bg-parchment/30 p-4"><Checkbox checked={aiConsent} onCheckedChange={(checked) => setAiConsent(checked === true)} /><span><span className="block text-sm font-medium">Allow AI-assisted resume parsing</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Only extracted resume text is sent to Gemini. You can use deterministic parsing without consent.</span></span></label></div> : null}
          <div className="mt-auto flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-between">
            <Button variant="ghost" disabled={pending || step === 1} onClick={() => setStep((value) => Math.max(1, value - 1))}><ArrowLeft aria-hidden />Back</Button>
            {step === 1 ? <Button disabled={pending} onClick={() => run(() => saveBasicsAction({ fullName, headline, careerStage }))}>{pending ? <Loader2 aria-hidden className="animate-spin" /> : null}Continue<ArrowRight aria-hidden /></Button> : null}
            {step === 2 ? <Button disabled={pending} onClick={() => run(markResumeStepAction)}>Continue for now<ArrowRight aria-hidden /></Button> : null}
            {step === 3 ? <Button disabled={pending} onClick={() => run(() => saveTargetsAction({ targetRoles: splitList(roles), preferredLocations: splitList(locations) }))}>Continue<ArrowRight aria-hidden /></Button> : null}
            {step === 4 ? <Button disabled={pending} onClick={() => run(() => savePreferencesAction({ targetRoles: splitList(roles), preferredLocations: splitList(locations), workArrangements: arrangements }))}>Review<ArrowRight aria-hidden /></Button> : null}
            {step === 5 ? <Button disabled={pending} onClick={complete}>{pending ? <Loader2 aria-hidden className="animate-spin" /> : <Check aria-hidden />}Finish setup</Button> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) { return <div className="grid gap-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-border p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm">{value}</p></div>; }

