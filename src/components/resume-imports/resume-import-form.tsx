"use client";

import { useRouter } from "next/navigation";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { RESUME_IMPORT_BUCKET } from "@/lib/resume-imports/constants";
import { RESUME_IMPORT_MAX_BYTES, RESUME_IMPORT_MIME_TYPES } from "@/lib/resume-imports/schemas";

type Stage = "idle" | "uploading" | "extracting" | "parsing";

export function ResumeImportForm({ returnTo }: { returnTo: "onboarding" | "resumes" }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [paste, setPaste] = useState("");
  const [useAi, setUseAi] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = stage !== "idle";

  async function json(response: Response) {
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message ?? "The import could not be completed.");
    return body;
  }

  async function process(importId: string) {
    setStage("extracting");
    const response = await fetch(`/api/resume-imports/${importId}/process`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ useAi }) });
    setStage("parsing");
    await json(response);
    router.push(`/resumes/import/${importId}/review?return=${returnTo}`);
  }

  async function handleFile(file?: File) {
    if (!file) return;
    setError(null);
    if (!(RESUME_IMPORT_MIME_TYPES as readonly string[]).includes(file.type)) return setError("Choose a PDF or DOCX file.");
    if (file.size > RESUME_IMPORT_MAX_BYTES) return setError("Files must be 10 MB or smaller.");
    try {
      setStage("uploading");
      const created = await json(await fetch("/api/resume-imports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceKind: "upload", fileName: file.name, mimeType: file.type, sizeBytes: file.size }) }));
      const supabase = createClient();
      const upload = await supabase.storage.from(RESUME_IMPORT_BUCKET).uploadToSignedUrl(created.path, created.token, file, { contentType: file.type });
      if (upload.error) throw upload.error;
      await process(created.importId);
    } catch (cause) {
      setStage("idle");
      setError(cause instanceof Error ? cause.message : "The import could not be completed.");
    }
  }

  async function handlePaste() {
    setError(null);
    try {
      setStage("uploading");
      const created = await json(await fetch("/api/resume-imports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceKind: "paste", text: paste }) }));
      await process(created.importId);
    } catch (cause) {
      setStage("idle");
      setError(cause instanceof Error ? cause.message : "The import could not be completed.");
    }
  }

  const progress = stage === "uploading" ? 25 : stage === "extracting" ? 55 : stage === "parsing" ? 82 : 0;
  return <div className="grid gap-5">
    <div><p className="micro-label text-primary">Career profile</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Import a resume</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">We extract a review draft first. Nothing reaches your career profile until you approve it.</p></div>
    {error ? <Alert variant="destructive"><AlertTitle>Import failed</AlertTitle><AlertDescription>{error} <button type="button" className="font-medium underline" onClick={() => setError(null)}>Try again</button></AlertDescription></Alert> : null}
    {busy ? <Card><CardHeader><CardTitle className="flex items-center gap-2"><Loader2 aria-hidden className="size-5 animate-spin" />{stage === "uploading" ? "Uploading securely" : stage === "extracting" ? "Extracting readable text" : "Classifying resume sections"}</CardTitle><CardDescription>This can take up to a minute. Keep this page open.</CardDescription></CardHeader><CardContent className="grid gap-2"><Progress value={progress} /><p className="text-xs text-muted-foreground" aria-live="polite">{progress}% complete</p></CardContent></Card> : <Tabs defaultValue="upload">
      <TabsList aria-label="Resume import method"><TabsTrigger value="upload">Upload file</TabsTrigger><TabsTrigger value="paste">Paste text</TabsTrigger></TabsList>
      <TabsContent value="upload"><Card><CardHeader><CardTitle>PDF or DOCX</CardTitle><CardDescription>Private, encrypted storage · 10 MB maximum</CardDescription></CardHeader><CardContent><input ref={inputRef} type="file" className="sr-only" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = ""; }} /><button type="button" className="surface-grid-sm grid min-h-56 w-full place-items-center rounded-xl border border-dashed border-border-strong p-6 text-center transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => inputRef.current?.click()} onDrop={(event) => { event.preventDefault(); void handleFile(event.dataTransfer.files[0]); }} onDragOver={(event) => event.preventDefault()}><span><UploadCloud aria-hidden className="mx-auto size-8 text-primary" /><span className="mt-4 block font-medium">Choose a resume or drop it here</span><span className="mt-1 block text-sm text-muted-foreground">PDF and DOCX only</span></span></button></CardContent></Card></TabsContent>
      <TabsContent value="paste"><Card><CardHeader><CardTitle>Paste resume text</CardTitle><CardDescription>Useful when your source file cannot be parsed cleanly.</CardDescription></CardHeader><CardContent className="grid gap-3"><Label htmlFor="resume-paste">Resume text</Label><Textarea id="resume-paste" value={paste} onChange={(event) => setPaste(event.target.value)} className="min-h-72 font-mono text-sm" placeholder="Paste the complete resume here…" /><Button onClick={() => void handlePaste()} disabled={paste.trim().length < 50}><FileText aria-hidden />Create review draft</Button></CardContent></Card></TabsContent>
    </Tabs>}
    <label className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"><Checkbox checked={useAi} onCheckedChange={(checked) => setUseAi(checked === true)} disabled={busy} /><span><span className="block text-sm font-medium">Use AI classification when available</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Requires consent saved during onboarding. Extracted text—not the original file—is sent to Gemini. Deterministic parsing remains the fallback.</span></span></label>
  </div>;
}
