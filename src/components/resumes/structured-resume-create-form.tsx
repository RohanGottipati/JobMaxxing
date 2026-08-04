import Link from "next/link";

import { createStructuredMasterResumeAction } from "@/app/(app)/documents/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { RESUME_TEMPLATES } from "@/lib/resumes/templates";

export function StructuredResumeCreateForm({ error, returnTo = "resumes" }: { error?: string; returnTo?: "onboarding" | "resumes" }) {
  return <div className="grid gap-5">
    {error ? <Alert variant="destructive"><AlertDescription>Choose a name and template, then try again.</AlertDescription></Alert> : null}
    <form action={createStructuredMasterResumeAction} className="grid gap-5">
      <input type="hidden" name="return_to" value={returnTo} />
      <Card><CardHeader><CardTitle>Resume details</CardTitle><CardDescription>Canonical profile items stay connected while this resume controls order, visibility, and presentation.</CardDescription></CardHeader><CardContent className="grid gap-2"><Label htmlFor="structured-resume-name">Name</Label><Input id="structured-resume-name" name="name" placeholder="Product engineering master" maxLength={160} required /></CardContent></Card>
      <fieldset><legend className="mb-3 text-sm font-medium">Choose a starting template</legend><div className="grid gap-3 sm:grid-cols-2">{RESUME_TEMPLATES.map((template, index) => <label key={template.id} className="group grid cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-xl border border-border bg-card p-3 transition-colors has-checked:border-primary has-checked:ring-2 has-checked:ring-primary/20"><input type="radio" name="template_id" value={template.id} defaultChecked={index === 0} className="mt-1 accent-primary" /><span><span className="block font-medium">{template.name}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{template.description}</span><span className="mt-3 block h-28 rounded border border-border bg-white p-3" aria-hidden><span className="mx-auto block h-2 w-2/3 rounded bg-neutral-800" /><span className="mx-auto mt-2 block h-1 w-1/2 rounded bg-neutral-300" /><span className="mt-4 block h-px bg-neutral-500" /><span className="mt-2 block h-1 w-full rounded bg-neutral-200" /><span className="mt-2 block h-1 w-4/5 rounded bg-neutral-200" /><span className="mt-4 block h-px bg-neutral-500" /></span></span></label>)}</div></fieldset>
      <div className="flex flex-wrap gap-2"><SubmitButton pendingLabel="Creating…">Create structured resume</SubmitButton><Link href="/resumes/import" className={buttonVariants({ variant: "outline" })}>Import existing resume</Link><Button asChild variant="ghost"><Link href="/resumes/new?mode=legacy">Use legacy text editor</Link></Button></div>
    </form>
  </div>;
}
