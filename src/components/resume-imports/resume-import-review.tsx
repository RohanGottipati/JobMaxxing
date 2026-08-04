"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { cloneElement, useMemo, useState, type ReactElement } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CareerProfileV1 } from "@/lib/career/schemas";
import { RESUME_TEMPLATES } from "@/lib/resumes/templates";
import type { DuplicateDecisions, ResumeImportResult } from "@/lib/resume-imports/schemas";

export function ResumeImportReview({ importId, sourceText, fileName, signedUrl, parsed, initialDuplicateDecisions, initialResumeName, initialTemplateId, returnTo }: { importId: string; sourceText: string; fileName: string | null; signedUrl: string | null; parsed: ResumeImportResult; initialDuplicateDecisions: DuplicateDecisions; initialResumeName?: string; initialTemplateId?: string; returnTo: "onboarding" | "resumes" }) {
  const router = useRouter();
  const [profile, setProfile] = useState(parsed.profile);
  const [resumeName, setResumeName] = useState(initialResumeName || fileName?.replace(/\.(pdf|docx)$/i, "") || "Imported resume");
  const [templateId, setTemplateId] = useState(initialTemplateId || "technical-classic");
  const [duplicateDecisions, setDuplicateDecisions] = useState<DuplicateDecisions>(initialDuplicateDecisions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uncertain = useMemo(() => new Set(parsed.uncertainPaths), [parsed.uncertainPaths]);

  function patch(next: Partial<CareerProfileV1>) { setProfile((current) => ({ ...current, ...next })); }
  function updateExperience(id: string, next: Partial<CareerProfileV1["experiences"][number]>) { setProfile((current) => ({ ...current, experiences: current.experiences.map((item) => item.id === id ? { ...item, ...next, verificationStatus: "user_confirmed", confidence: 1 } : item) })); }
  function updateEducation(id: string, next: Partial<CareerProfileV1["education"][number]>) { setProfile((current) => ({ ...current, education: current.education.map((item) => item.id === id ? { ...item, ...next } : item) })); }
  function updateProject(id: string, next: Partial<CareerProfileV1["projects"][number]>) { setProfile((current) => ({ ...current, projects: current.projects.map((item) => item.id === id ? { ...item, ...next, verificationStatus: "user_confirmed", confidence: 1 } : item) })); }

  async function saveDraft() {
    setSaving(true); setError(null);
    const response = await fetch(`/api/resume-imports/${importId}/review`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schemaVersion: 1, profile, duplicateDecisions, resumeName, templateId }) });
    setSaving(false);
    if (!response.ok) setError("The review draft could not be saved.");
  }

  async function commit() {
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/resume-imports/${importId}/commit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, duplicateDecisions, name: resumeName, templateId, onboarding: returnTo === "onboarding" }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "The reviewed resume could not be saved.");
      router.push(returnTo === "onboarding" ? "/onboarding" : `/resumes/${body.resume_id}`);
      router.refresh();
    } catch (cause) {
      setSaving(false); setError(cause instanceof Error ? cause.message : "The reviewed resume could not be saved.");
    }
  }

  return <div className="grid gap-5">
    <div><p className="micro-label text-primary">Review required</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Compare before saving</h1><p className="mt-2 text-sm text-muted-foreground">Uncertain fields are marked. Correct them here; no candidate data has been committed.</p></div>
    {parsed.warnings.map((warning) => <Alert key={warning}><AlertTriangle aria-hidden /><AlertDescription>{warning}</AlertDescription></Alert>)}
    {error ? <Alert variant="destructive"><AlertTitle>Could not save</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
    <div className="grid min-w-0 gap-5 xl:grid-cols-2">
      <Card className="min-w-0 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-7rem)]"><CardHeader><CardTitle>Original source</CardTitle><CardDescription>{fileName ?? "Pasted text"}</CardDescription></CardHeader><CardContent className="min-h-0">{signedUrl ? <iframe src={signedUrl} title="Original uploaded resume" className="h-[65dvh] min-h-96 w-full rounded-lg border border-border bg-white" /> : <pre className="table-scroll max-h-[65dvh] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-parchment/30 p-4 text-xs leading-6">{sourceText}</pre>}</CardContent></Card>
      <div className="grid min-w-0 gap-4">
        <Card><CardHeader><CardTitle>Contact and summary</CardTitle></CardHeader><CardContent className="grid gap-4"><ReviewField label="Full name" uncertain={uncertain.has("fullName")}><Input value={profile.fullName} onChange={(event) => patch({ fullName: event.target.value })} /></ReviewField><ReviewField label="Phone" uncertain={uncertain.has("phone")}><Input value={profile.phone} onChange={(event) => patch({ phone: event.target.value })} /></ReviewField><ReviewField label="Professional summary" uncertain={uncertain.has("summary")}><Textarea value={profile.summary} onChange={(event) => patch({ summary: event.target.value })} className="min-h-28" /></ReviewField></CardContent></Card>
        <Card><CardHeader><CardTitle>Experience</CardTitle><CardDescription>{profile.experiences.length ? "Confirm role and company mappings." : "No experience was detected. You can add it later from your profile."}</CardDescription></CardHeader><CardContent className="grid gap-4">{profile.experiences.map((item) => <div key={item.id} className="grid gap-3 rounded-lg border border-border p-4"><div className="flex justify-between gap-2"><Badge variant="outline">{item.sourceKind === "resume_import" ? "Imported" : "Existing"}</Badge>{uncertain.has(`experiences.${item.id}`) ? <Badge variant="destructive">Check mapping</Badge> : null}</div><Input aria-label="Job title" value={item.jobTitle} onChange={(event) => updateExperience(item.id, { jobTitle: event.target.value })} /><Input aria-label="Company" value={item.company} onChange={(event) => updateExperience(item.id, { company: event.target.value })} /><div className="grid gap-2 sm:grid-cols-2"><Input aria-label="Start date" value={item.startDate} onChange={(event) => updateExperience(item.id, { startDate: event.target.value })} /><Input aria-label="End date" value={item.endDate} onChange={(event) => updateExperience(item.id, { endDate: event.target.value })} /></div>{item.bullets.map((bullet) => <Textarea key={bullet.id} aria-label="Experience bullet" value={bullet.approvedText} onChange={(event) => updateExperience(item.id, { bullets: item.bullets.map((current) => current.id === bullet.id ? { ...current, approvedText: event.target.value, verificationStatus: "user_confirmed", confidence: 1 } : current) })} />)}</div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Education</CardTitle></CardHeader><CardContent className="grid gap-4">{profile.education.map((item) => <div key={item.id} className="grid gap-2 rounded-lg border border-border p-4"><Input aria-label="School" value={item.school} onChange={(event) => updateEducation(item.id, { school: event.target.value })} /><Input aria-label="Degree" value={item.degree} onChange={(event) => updateEducation(item.id, { degree: event.target.value })} /></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Projects and skills</CardTitle></CardHeader><CardContent className="grid gap-4">{profile.projects.map((item) => <div key={item.id} className="grid gap-2 rounded-lg border border-border p-4"><Input aria-label="Project title" value={item.title} onChange={(event) => updateProject(item.id, { title: event.target.value })} />{item.bullets.map((bullet) => <Textarea key={bullet.id} aria-label="Project bullet" value={bullet.approvedText} onChange={(event) => updateProject(item.id, { bullets: item.bullets.map((current) => current.id === bullet.id ? { ...current, approvedText: event.target.value, verificationStatus: "user_confirmed", confidence: 1 } : current) })} />)}</div>)}<ReviewField label="Skills" uncertain={false}><Textarea value={profile.skills.map((skill) => skill.name).join(", ")} onChange={(event) => patch({ skills: event.target.value.split(",").map((name, index) => ({ id: profile.skills[index]?.id ?? crypto.randomUUID(), name: name.trim() })).filter((skill) => skill.name) })} /></ReviewField></CardContent></Card>
        {parsed.duplicates.length ? <Card><CardHeader><CardTitle>Resolve possible duplicates</CardTitle><CardDescription>Nothing is discarded silently. Choose what should happen for each imported item.</CardDescription></CardHeader><CardContent className="grid gap-3">{parsed.duplicates.map((item) => { const id = `duplicate-${item.importedId}`; return <div key={item.importedId} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.label}</p><p className="text-xs capitalize text-muted-foreground">Possible duplicate {item.kind}</p></div><div className="grid gap-1"><Label htmlFor={id} className="sr-only">How to handle {item.label}</Label><Select id={id} value={duplicateDecisions[item.importedId] ?? "keep_existing"} onChange={(event) => setDuplicateDecisions((current) => ({ ...current, [item.importedId]: event.target.value as DuplicateDecisions[string] }))}><option value="keep_existing">Keep existing</option><option value="merge">Merge missing details</option><option value="create_separate">Create separate item</option></Select></div></div>; })}</CardContent></Card> : null}
        <Card><CardHeader><CardTitle>Create the base resume</CardTitle></CardHeader><CardContent className="grid gap-4"><ReviewField label="Resume name" uncertain={false}><Input value={resumeName} onChange={(event) => setResumeName(event.target.value)} /></ReviewField><ReviewField label="Template" uncertain={false}><Select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{RESUME_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</Select></ReviewField></CardContent></Card>
      </div>
    </div>
    <div className="sticky bottom-3 z-20 flex flex-col gap-2 rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:justify-end"><Button variant="outline" disabled={saving} onClick={() => void saveDraft()}>Save review draft</Button><Button disabled={saving || !resumeName.trim()} onClick={() => void commit()}>{saving ? <Loader2 aria-hidden className="animate-spin" /> : <Check aria-hidden />}Approve and create resume</Button></div>
  </div>;
}

function ReviewField({ label, uncertain, children }: { label: string; uncertain: boolean; children: ReactElement<{ id?: string }> }) { const id = `review-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`; return <div className={uncertain ? "grid gap-1.5 rounded-lg border border-warning/50 bg-warning/5 p-3" : "grid gap-1.5"}><div className="flex items-center justify-between gap-2"><Label htmlFor={id}>{label}</Label>{uncertain ? <Badge variant="outline" className="border-warning/50 text-warning">Low confidence</Badge> : null}</div>{cloneElement(children, { id })}</div>; }
