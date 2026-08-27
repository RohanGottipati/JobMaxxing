"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { ArrowDown, ArrowUp, BarChart3, Check, CheckCircle2, Copy, Download, Eye, EyeOff, GripVertical, History, Loader2, Plus, Printer, Redo2, Save, Settings2, Star, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResumePrintDocument } from "@/components/resumes/resume-print-document";
import { BulletAssistant } from "@/components/resumes/bullet-assistant";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import type { CareerProfileV1 } from "@/lib/career/schemas";
import { createResumeRenderModel } from "@/lib/resumes/render-model";
import { RESUME_SECTION_TYPES, type ResumeDocumentV1, type ResumeSectionType } from "@/lib/resumes/schema";
import { getResumeTemplate, RESUME_TEMPLATES } from "@/lib/resumes/templates";
import { cn } from "@/lib/utils";

type HistoryItem = { id: string; row_version: number; title: string; template_id: string; structured_content: ResumeDocumentV1; reason: string; created_at: string };
type SaveState = "saved" | "unsaved" | "saving" | "offline" | "conflict" | "failed";
type ResumeEntry = ResumeDocumentV1["sections"][number]["entries"][number];

export function StructuredResumeEditor(props: {
  kind: "master" | "tailored";
  id: string;
  title: string;
  rowVersion: number;
  submitted: boolean;
  document: ResumeDocumentV1;
  profile: CareerProfileV1 & { email: string | null };
  history: HistoryItem[];
  applicationId?: string | null;
  duplicateAction?: () => Promise<void>;
  submitAction?: () => Promise<void>;
  deleteAction?: () => Promise<void>;
  defaultAction?: () => Promise<void>;
  isDefault?: boolean;
}) {
  const [title, setTitle] = useState(props.title);
  const [document, setDocument] = useState(props.document);
  const [rowVersion, setRowVersion] = useState(props.rowVersion);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [activeSection, setActiveSection] = useState(props.document.sections[0]?.id ?? "");
  const [undoStack, setUndoStack] = useState<ResumeDocumentV1[]>([]);
  const [redoStack, setRedoStack] = useState<ResumeDocumentV1[]>([]);
  const baseline = useRef(JSON.stringify({ title: props.title, document: props.document }));
  const latestVersion = useRef(props.rowVersion);
  const saving = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const storageKey = `jobmaxxing:resume-draft:${props.kind}:${props.id}`;

  const mutate = useCallback((updater: (current: ResumeDocumentV1) => ResumeDocumentV1) => {
    if (props.submitted) return;
    setDocument((current) => {
      const next = updater(current);
      if (JSON.stringify(next) === JSON.stringify(current)) return current;
      setUndoStack((history) => [...history.slice(-99), current]);
      setRedoStack([]);
      setSaveState("unsaved");
      return next;
    });
  }, [props.submitted]);

  const saveNow = useCallback(async () => {
    if (props.submitted || saving.current) return;
    const serialized = JSON.stringify({ title, document });
    if (serialized === baseline.current) return;
    saving.current = true;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/resume-documents/${props.kind}/${props.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "If-Match": String(latestVersion.current) }, body: serialized });
      const body = await response.json();
      if (response.status === 409) { setSaveState("conflict"); return; }
      if (!response.ok) throw new Error(body.error?.message ?? "Save failed.");
      latestVersion.current = body.rowVersion;
      setRowVersion(body.rowVersion);
      baseline.current = serialized;
      sessionStorage.removeItem(storageKey);
      setSaveState("saved");
    } catch {
      sessionStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), rowVersion: latestVersion.current, title, document }));
      setSaveState(navigator.onLine ? "failed" : "offline");
    } finally {
      saving.current = false;
    }
  }, [document, props.id, props.kind, props.submitted, storageKey, title]);

  useEffect(() => {
    const serialized = JSON.stringify({ title, document });
    if (serialized === baseline.current || props.submitted || saveState === "conflict") return;
    setSaveState("unsaved");
    const timeout = window.setTimeout(() => void saveNow(), 800);
    return () => window.clearTimeout(timeout);
  }, [document, props.submitted, saveNow, saveState, title]);

  useEffect(() => {
    const draft = sessionStorage.getItem(storageKey);
    if (!draft) return;
    try {
      const parsed = JSON.parse(draft) as { savedAt: number; rowVersion: number; title: string; document: ResumeDocumentV1 };
      if (Date.now() - parsed.savedAt < 86_400_000 && parsed.rowVersion === props.rowVersion) {
        setTitle(parsed.title); setDocument(parsed.document); setSaveState("unsaved");
        toast.info("Recovered an unsaved draft from this tab.");
      } else sessionStorage.removeItem(storageKey);
    } catch { sessionStorage.removeItem(storageKey); }
  }, [props.rowVersion, storageKey]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  function undo() { const previous = undoStack.at(-1); if (!previous) return; setUndoStack((items) => items.slice(0, -1)); setRedoStack((items) => [...items, document]); setDocument(previous); setSaveState("unsaved"); }
  function redo() { const next = redoStack.at(-1); if (!next) return; setRedoStack((items) => items.slice(0, -1)); setUndoStack((items) => [...items, document]); setDocument(next); setSaveState("unsaved"); }
  function dragEnd(event: DragEndEvent) { if (!event.over || event.active.id === event.over.id) return; mutate((current) => { const oldIndex = current.sections.findIndex((item) => item.id === event.active.id); const newIndex = current.sections.findIndex((item) => item.id === event.over?.id); return { ...current, sections: arrayMove(current.sections, oldIndex, newIndex) }; }); }
  function patchSection(id: string, patch: Partial<ResumeDocumentV1["sections"][number]>) { mutate((current) => ({ ...current, sections: current.sections.map((item) => item.id === id ? { ...item, ...patch } : item) })); }
  function moveSection(id: string, direction: -1 | 1) { mutate((current) => { const index = current.sections.findIndex((item) => item.id === id); const target = Math.max(0, Math.min(current.sections.length - 1, index + direction)); return { ...current, sections: arrayMove(current.sections, index, target) }; }); }
  function addSection(type: ResumeSectionType) { mutate((current) => ({ ...current, sections: [...current.sections, { id: crypto.randomUUID(), type, title: SECTION_LABELS[type], visible: true, pageBreakBefore: false, entries: entriesForType(type, props.profile) }] })); }
  function duplicateSection(id: string) { mutate((current) => { const source = current.sections.find((item) => item.id === id); if (!source) return current; return { ...current, sections: [...current.sections, { ...structuredClone(source), id: crypto.randomUUID(), title: `${source.title} copy`, entries: source.entries.map((entry) => ({ ...entry, id: crypto.randomUUID() })) }] }; }); }
  function removeSection(id: string) { mutate((current) => ({ ...current, sections: current.sections.filter((item) => item.id !== id) })); setActiveSection(document.sections.find((item) => item.id !== id)?.id ?? ""); }

  async function checkpoint() {
    await saveNow();
    const response = await fetch(`/api/resume-documents/${props.kind}/${props.id}/checkpoints`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedVersion: latestVersion.current, document, reason: "manual" }) });
    if (response.ok) toast.success("Version checkpoint saved"); else toast.error("Could not save a checkpoint");
  }
  async function restore(historyId: string) {
    const response = await fetch(`/api/resume-documents/${props.kind}/${props.id}/restore`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedVersion: latestVersion.current, historyId }) });
    const body = await response.json();
    if (!response.ok) return toast.error(body.error?.message ?? "Could not restore that version.");
    window.location.reload();
  }

  const pageCount = approximatePageCount(document, props.profile);
  const active = document.sections.find((item) => item.id === activeSection) ?? document.sections[0];
  const missingSections = RESUME_SECTION_TYPES.filter((type) => !document.sections.some((section) => section.type === type));
  const saveLabel = { saved: "Saved", unsaved: "Unsaved", saving: "Saving…", offline: "Offline draft", conflict: "Save conflict", failed: "Save failed" }[saveState];

  return <div className="grid gap-4">
    {saveState === "conflict" ? <Alert variant="destructive"><AlertDescription>This resume changed in another session. Your draft is preserved in this tab. <Button variant="link" className="h-auto p-0" onClick={() => window.location.reload()}>Reload current version</Button></AlertDescription></Alert> : null}
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center">
      <Input aria-label="Resume name" value={title} onChange={(event) => { setTitle(event.target.value); setSaveState("unsaved"); }} disabled={props.submitted} className="max-w-md font-semibold" />
      <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end"><Badge variant={saveState === "failed" || saveState === "conflict" ? "destructive" : "outline"} aria-live="polite">{saveState === "saving" ? <Loader2 aria-hidden className="mr-1 size-3 animate-spin" /> : saveState === "saved" ? <Check aria-hidden className="mr-1 size-3" /> : null}{saveLabel}</Badge><Badge variant={pageCount > document.presentation.targetPages ? "destructive" : "secondary"}>{pageCount} page{pageCount === 1 ? "" : "s"}</Badge><Button variant="outline" size="icon-sm" onClick={undo} disabled={!undoStack.length || props.submitted} aria-label="Undo"><Undo2 aria-hidden /></Button><Button variant="outline" size="icon-sm" onClick={redo} disabled={!redoStack.length || props.submitted} aria-label="Redo"><Redo2 aria-hidden /></Button><Button variant="outline" size="sm" onClick={() => void checkpoint()} disabled={props.submitted}><Save aria-hidden />Save version</Button><Button asChild variant="outline" size="sm"><Link href={`/resumes/${props.kind === "tailored" ? "versions/" : ""}${props.id}/analysis`}><BarChart3 aria-hidden />Review</Link></Button><Button asChild variant="outline" size="sm"><Link href={`/resumes/${props.kind === "tailored" ? "versions/" : ""}${props.id}/print`} target="_blank"><Printer aria-hidden />Print</Link></Button><ExportMenu kind={props.kind} id={props.id} rowVersion={rowVersion} /></div>
    </div>
    {pageCount > document.presentation.targetPages ? <Alert><AlertDescription>This content is likely to exceed the {document.presentation.targetPages === 1 ? "one-page" : "two-page"} target. Reduce spacing, hide lower-priority entries, or choose a compact template.</AlertDescription></Alert> : null}
    <Tabs defaultValue="edit" className="xl:hidden"><TabsList><TabsTrigger value="edit">Edit</TabsTrigger><TabsTrigger value="preview">Preview</TabsTrigger></TabsList><TabsContent value="edit"><EditorPanel /></TabsContent><TabsContent value="preview"><ResumePreview document={document} profile={props.profile} /></TabsContent></Tabs>
    <div className="hidden min-w-0 gap-4 xl:grid xl:grid-cols-[minmax(20rem,0.72fr)_minmax(0,1.28fr)]"><EditorPanel /><div className="sticky top-4 max-h-[calc(100dvh-7rem)] overflow-auto rounded-xl border border-border bg-parchment/50 p-4"><ResumePreview document={document} profile={props.profile} /></div></div>
  </div>;

  function EditorPanel() { return <div className="grid min-w-0 content-start gap-4">
    <Card><CardHeader><CardTitle className="text-base">Sections</CardTitle><CardDescription>Drag with a pointer or keyboard. Move buttons are always available.</CardDescription></CardHeader><CardContent><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}><SortableContext items={document.sections.map((item) => item.id)} strategy={verticalListSortingStrategy}><div className="grid gap-2">{document.sections.map((section, index) => <SortableSection key={section.id} section={section} active={active?.id === section.id} index={index} count={document.sections.length} onActivate={() => setActiveSection(section.id)} onPatch={(patch) => patchSection(section.id, patch)} onMove={(direction) => moveSection(section.id, direction)} />)}</div></SortableContext></DndContext>{missingSections.length ? <div className="mt-3 flex gap-2"><Select id="add-section-select" defaultValue={missingSections[0]}>{missingSections.map((type) => <option key={type} value={type}>{SECTION_LABELS[type]}</option>)}</Select><Button variant="outline" onClick={() => { const select = window.document.getElementById("add-section-select") as HTMLSelectElement | null; if (select) addSection(select.value as ResumeSectionType); }}><Plus aria-hidden />Add</Button></div> : null}</CardContent></Card>
    {active ? <Card><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">Edit {active.title}</CardTitle><CardDescription>Changes here apply only to this resume.</CardDescription></div><div className="flex gap-1"><Button variant="ghost" size="icon-sm" onClick={() => duplicateSection(active.id)} aria-label={`Duplicate ${active.title}`}><Copy aria-hidden /></Button><Button variant="ghost" size="icon-sm" onClick={() => removeSection(active.id)} aria-label={`Delete ${active.title}`} className="text-destructive"><Trash2 aria-hidden /></Button></div></div></CardHeader><CardContent className="grid gap-4"><div className="grid gap-1.5"><Label htmlFor="section-title">Section title</Label><Input id="section-title" value={active.title} onChange={(event) => patchSection(active.id, { title: event.target.value })} /></div><label className="flex items-center gap-2 text-sm"><Checkbox checked={active.pageBreakBefore} onCheckedChange={(checked) => patchSection(active.id, { pageBreakBefore: checked === true })} />Start on a new page</label><SectionEntries section={active} profile={props.profile} kind={props.kind} resumeId={props.id} applicationId={props.applicationId ?? null} submitted={props.submitted} onChange={(entries) => patchSection(active.id, { entries })} /></CardContent></Card> : null}
    <PresentationPanel document={document} onChange={(presentation) => mutate((current) => ({ ...current, presentation }))} />
    <HistoryPanel history={props.history} onRestore={(id) => void restore(id)} />
    <StructuredDocumentActions
      submitted={props.submitted}
      isDefault={props.isDefault}
      duplicateAction={props.duplicateAction}
      submitAction={props.submitAction}
      defaultAction={props.defaultAction}
      deleteAction={props.deleteAction}
    />
  </div>; }
}

const SECTION_LABELS: Record<ResumeSectionType, string> = { header: "Contact", summary: "Professional Summary", experience: "Experience", education: "Education", projects: "Projects", skills: "Skills", certifications: "Certifications", awards: "Awards", publications: "Publications", volunteer: "Volunteer Experience", languages: "Languages" };

function entriesForType(type: ResumeSectionType, profile: CareerProfileV1) { const ids = type === "experience" ? profile.experiences.filter((item) => item.kind === "work").map((item) => item.id) : type === "volunteer" ? profile.experiences.filter((item) => item.kind === "volunteer").map((item) => item.id) : type === "education" ? profile.education.map((item) => item.id) : type === "projects" ? profile.projects.map((item) => item.id) : type === "skills" ? profile.skills.map((item) => item.id) : type === "certifications" ? profile.certifications.map((item) => item.id) : type === "awards" ? profile.achievements.filter((item) => item.kind === "award").map((item) => item.id) : type === "publications" ? profile.publications.map((item) => item.id) : type === "languages" ? profile.languages.map((item) => item.id) : []; return ids.map((id) => ({ id: crypto.randomUUID(), profileItemId: id, visible: true, bulletIds: type === "experience" || type === "volunteer" ? profile.experiences.find((item) => item.id === id)?.bullets.map((bullet) => bullet.id) ?? [] : type === "projects" ? profile.projects.find((item) => item.id === id)?.bullets.map((bullet) => bullet.id) ?? [] : [], hiddenBulletIds: [], textOverrides: {} })); }

function SortableSection({ section, active, index, count, onActivate, onPatch, onMove }: { section: ResumeDocumentV1["sections"][number]; active: boolean; index: number; count: number; onActivate: () => void; onPatch: (patch: Partial<typeof section>) => void; onMove: (direction: -1 | 1) => void }) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: section.id });

  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("flex items-center gap-1 rounded-lg border p-2", active ? "border-primary bg-primary/5" : "border-border bg-background")}><button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} className="grid size-9 shrink-0 place-items-center rounded text-muted-foreground focus-visible:outline-2" aria-label={`Drag ${section.title}`}><GripVertical aria-hidden /></button><button type="button" className="min-w-0 flex-1 truncate px-1 text-left text-sm font-medium" onClick={onActivate}>{section.title}</button><Button variant="ghost" size="icon-sm" onClick={() => onPatch({ visible: !section.visible })} aria-label={section.visible ? `Hide ${section.title}` : `Show ${section.title}`}>{section.visible ? <Eye aria-hidden /> : <EyeOff aria-hidden />}</Button><Button variant="ghost" size="icon-sm" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move ${section.title} up`}><ArrowUp aria-hidden /></Button><Button variant="ghost" size="icon-sm" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Move ${section.title} down`}><ArrowDown aria-hidden /></Button></div>;
}

function SectionEntries({ section, profile, kind, resumeId, applicationId, submitted, onChange }: { section: ResumeDocumentV1["sections"][number]; profile: CareerProfileV1; kind: "master" | "tailored"; resumeId: string; applicationId: string | null; submitted: boolean; onChange: (entries: typeof section.entries) => void }) { const candidates = entriesForType(section.type, profile); const unused = candidates.filter((candidate) => !section.entries.some((entry) => entry.profileItemId === candidate.profileItemId)); if (["header", "summary"].includes(section.type)) return section.type === "summary" ? <div className="grid gap-1.5"><Label htmlFor="summary-override">Summary override</Label><Textarea id="summary-override" value={section.entries[0]?.textOverrides.summary ?? profile.summary} onChange={(event) => onChange([{ id: section.entries[0]?.id ?? crypto.randomUUID(), profileItemId: null, visible: true, bulletIds: [], hiddenBulletIds: [], textOverrides: { summary: event.target.value } }])} /></div> : <p className="text-sm text-muted-foreground">Contact details come from your canonical profile.</p>; return <div className="grid gap-3"><div className="grid gap-2">{section.entries.map((entry, index) => { const label = itemLabel(section.type, entry.profileItemId, profile); return <div key={entry.id} className="grid gap-2 rounded-lg border border-border p-3"><div className="flex items-center gap-1"><span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span><Button variant="ghost" size="icon-sm" onClick={() => onChange(arrayMove(section.entries, index, Math.max(0, index - 1)))} disabled={index === 0} aria-label={`Move ${label} up`}><ArrowUp aria-hidden /></Button><Button variant="ghost" size="icon-sm" onClick={() => onChange(arrayMove(section.entries, index, Math.min(section.entries.length - 1, index + 1)))} disabled={index === section.entries.length - 1} aria-label={`Move ${label} down`}><ArrowDown aria-hidden /></Button><Button variant="ghost" size="icon-sm" onClick={() => onChange(section.entries.filter((item) => item.id !== entry.id))} aria-label={`Remove ${label}`}><Trash2 aria-hidden /></Button></div>{(section.type === "experience" || section.type === "volunteer" || section.type === "projects") ? <EntryBullets entry={entry} sectionType={section.type} profile={profile} kind={kind} resumeId={resumeId} applicationId={applicationId} submitted={submitted} onChange={(next) => onChange(section.entries.map((item) => item.id === entry.id ? next : item))} /> : null}</div>; })}</div>{unused.length ? <div className="flex gap-2"><Select id={`entry-${section.id}`} defaultValue={unused[0]?.profileItemId ?? ""}>{unused.map((entry) => <option key={entry.id} value={entry.profileItemId ?? ""}>{itemLabel(section.type, entry.profileItemId, profile)}</option>)}</Select><Button variant="outline" onClick={() => { const select = document.getElementById(`entry-${section.id}`) as HTMLSelectElement | null; const candidate = unused.find((item) => item.profileItemId === select?.value); if (candidate) onChange([...section.entries, candidate]); }}><Plus aria-hidden />Add</Button></div> : null}</div>; }

function EntryBullets({ entry, sectionType, profile, kind, resumeId, applicationId, submitted, onChange }: { entry: ResumeEntry; sectionType: ResumeSectionType; profile: CareerProfileV1; kind: "master" | "tailored"; resumeId: string; applicationId: string | null; submitted: boolean; onChange: (entry: ResumeEntry) => void }) { const source = sectionType === "projects" ? profile.projects.find((item) => item.id === entry.profileItemId) : profile.experiences.find((item) => item.id === entry.profileItemId); if (!source) return null; return <div className="grid gap-3">{entry.bulletIds.map((id, index) => { const bullet = source.bullets.find((item) => item.id === id); if (!bullet) return null; const text = entry.textOverrides[id] ?? bullet.approvedText; const locked = bullet.isLocked || Boolean(entry.lockedBulletIds?.includes(id)); return <div key={id} className="grid gap-2 rounded-md bg-muted/20 p-2"><div className="grid grid-cols-[1fr_auto] gap-1"><Textarea aria-label={`Bullet ${index + 1}`} value={text} disabled={submitted || locked} onChange={(event) => onChange({ ...entry, textOverrides: { ...entry.textOverrides, [id]: event.target.value } })} className="min-h-20 text-sm" /><div className="grid content-start"><Button variant="ghost" size="icon-sm" onClick={() => onChange({ ...entry, bulletIds: arrayMove(entry.bulletIds, index, Math.max(0, index - 1)) })} disabled={index === 0 || submitted} aria-label="Move bullet up"><ArrowUp aria-hidden /></Button><Button variant="ghost" size="icon-sm" onClick={() => onChange({ ...entry, bulletIds: arrayMove(entry.bulletIds, index, Math.min(entry.bulletIds.length - 1, index + 1)) })} disabled={index === entry.bulletIds.length - 1 || submitted} aria-label="Move bullet down"><ArrowDown aria-hidden /></Button><Button variant="ghost" size="icon-sm" onClick={() => onChange({ ...entry, bulletIds: entry.bulletIds.filter((item) => item !== id), hiddenBulletIds: [...entry.hiddenBulletIds, id] })} disabled={submitted} aria-label="Hide bullet"><EyeOff aria-hidden /></Button></div></div><BulletAssistant kind={kind} resumeId={resumeId} applicationId={applicationId} bulletId={id} locked={locked} disabled={submitted || bullet.isLocked} onAccept={(suggestedText) => onChange({ ...entry, textOverrides: { ...entry.textOverrides, [id]: suggestedText } })} onRestore={() => onChange({ ...entry, textOverrides: { ...entry.textOverrides, [id]: bullet.originalText } })} onToggleLock={() => { const current = entry.lockedBulletIds ?? []; onChange({ ...entry, lockedBulletIds: current.includes(id) ? current.filter((item) => item !== id) : [...current, id] }); }} /></div>; })}</div>; }

function itemLabel(type: ResumeSectionType, id: string | null, profile: CareerProfileV1) { if (!id) return "Profile content"; if (type === "experience" || type === "volunteer") { const item = profile.experiences.find((value) => value.id === id); return item ? `${item.jobTitle} · ${item.company}` : "Missing experience"; } if (type === "education") return profile.education.find((item) => item.id === id)?.school ?? "Missing education"; if (type === "projects") return profile.projects.find((item) => item.id === id)?.title ?? "Missing project"; if (type === "skills") return profile.skills.find((item) => item.id === id)?.name ?? "Missing skill"; if (type === "certifications") return profile.certifications.find((item) => item.id === id)?.name ?? "Missing certification"; if (type === "awards") return profile.achievements.find((item) => item.id === id)?.title ?? "Missing award"; if (type === "publications") return profile.publications.find((item) => item.id === id)?.title ?? "Missing publication"; if (type === "languages") return profile.languages.find((item) => item.id === id)?.name ?? "Missing language"; return "Profile content"; }

function PresentationPanel({ document, onChange }: { document: ResumeDocumentV1; onChange: (presentation: ResumeDocumentV1["presentation"]) => void }) { const value = document.presentation; const patch = (next: Partial<typeof value>) => onChange({ ...value, ...next }); return <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Settings2 aria-hidden className="size-4" />Presentation</CardTitle></CardHeader><CardContent className="grid gap-4"><div className="grid gap-1.5"><Label htmlFor="template">Template</Label><Select id="template" value={value.templateId} onChange={(event) => patch({ templateId: event.target.value as typeof value.templateId })}>{RESUME_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</Select></div><div className="grid grid-cols-2 gap-3"><div className="grid gap-1.5"><Label htmlFor="paper">Paper</Label><Select id="paper" value={value.paperSize} onChange={(event) => patch({ paperSize: event.target.value as "letter" | "a4" })}><option value="letter">US Letter</option><option value="a4">A4</option></Select></div><div className="grid gap-1.5"><Label htmlFor="target-pages">Page target</Label><Select id="target-pages" value={value.targetPages} onChange={(event) => patch({ targetPages: Number(event.target.value) as 1 | 2 })}><option value="1">One page</option><option value="2">Two pages</option></Select></div></div><Range label="Font size" value={value.fontScale} min={0.85} max={1.15} step={0.01} onChange={(fontScale) => patch({ fontScale })} /><Range label="Line height" value={value.lineHeight} min={1} max={1.5} step={0.02} onChange={(lineHeight) => patch({ lineHeight })} /><Range label="Margins" value={value.marginsPt.top} min={24} max={72} step={2} onChange={(margin) => patch({ marginsPt: { top: margin, right: margin, bottom: margin, left: margin } })} /><Range label="Section spacing" value={value.sectionGapPt} min={4} max={24} step={1} onChange={(sectionGapPt) => patch({ sectionGapPt })} /><Range label="Bullet spacing" value={value.bulletGapPt} min={0} max={12} step={1} onChange={(bulletGapPt) => patch({ bulletGapPt })} /></CardContent></Card>; }
function Range({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) { const id = `range-${label.replace(/\s/g, "-")}`; return <div className="grid gap-1.5"><div className="flex justify-between"><Label htmlFor={id}>{label}</Label><span className="text-xs text-muted-foreground">{value}</span></div><input id={id} type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className="accent-primary" /></div>; }

function HistoryPanel({ history, onRestore }: { history: HistoryItem[]; onRestore: (id: string) => void }) { return <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><History aria-hidden className="size-4" />Version history</CardTitle><CardDescription>Restoring creates a new current revision.</CardDescription></CardHeader><CardContent>{history.length ? <div className="grid gap-2">{history.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"><span><span className="block text-sm font-medium">Revision {item.row_version}</span><span className="block text-xs text-muted-foreground">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</span></span><Button variant="outline" size="sm" onClick={() => onRestore(item.id)}>Restore</Button></div>)}</div> : <p className="text-sm text-muted-foreground">No checkpoints yet.</p>}</CardContent></Card>; }

function StructuredDocumentActions({ submitted, isDefault, duplicateAction, submitAction, deleteAction, defaultAction }: {
  submitted: boolean;
  isDefault?: boolean;
  duplicateAction?: () => Promise<void>;
  submitAction?: () => Promise<void>;
  deleteAction?: () => Promise<void>;
  defaultAction?: () => Promise<void>;
}) {
  if (!duplicateAction && !submitAction && !deleteAction && !defaultAction) return null;
  return <Card><CardHeader><CardTitle className="text-base">Resume actions</CardTitle><CardDescription>Manage this resume without changing canonical profile facts.</CardDescription></CardHeader><CardContent className="grid gap-2">
    {defaultAction && !isDefault ? <form action={defaultAction}><SubmitButton type="submit" variant="outline" className="w-full justify-start" pendingLabel="Setting default…"><Star aria-hidden />Make default resume</SubmitButton></form> : null}
    {submitAction && !submitted ? <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="w-full justify-start"><CheckCircle2 aria-hidden />Mark as submitted</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Mark this resume as submitted?</AlertDialogTitle><AlertDialogDescription>This locks the current resume as a permanent record of what you sent. Duplicate it later to create an editable version.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><form action={submitAction}><SubmitButton type="submit" className="w-full" pendingLabel="Locking…">Mark submitted</SubmitButton></form></AlertDialogFooter></AlertDialogContent></AlertDialog> : null}
    {duplicateAction ? <form action={duplicateAction}><SubmitButton type="submit" variant="outline" className="w-full justify-start" pendingLabel="Duplicating…"><Copy aria-hidden />{submitted ? "Duplicate to edit" : "Duplicate resume"}</SubmitButton></form> : null}
    {deleteAction && !submitted ? <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" className="w-full justify-start"><Trash2 aria-hidden />Delete resume</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this resume?</AlertDialogTitle><AlertDialogDescription>This removes the resume, its version history, and its private attachment. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><form action={deleteAction}><SubmitButton type="submit" variant="destructive" className="w-full" pendingLabel="Deleting…">Delete permanently</SubmitButton></form></AlertDialogFooter></AlertDialogContent></AlertDialog> : null}
  </CardContent></Card>;
}

function ExportMenu({ kind, id, rowVersion }: { kind: "master" | "tailored"; id: string; rowVersion: number }) { const [loading, setLoading] = useState<string | null>(null); async function download(format: "pdf" | "docx") { setLoading(format); try { const response = await fetch(`/api/resume-documents/${kind}/${id}/exports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ format, expectedVersion: rowVersion }) }); if (!response.ok) { const body = await response.json(); throw new Error(body.error?.message ?? "Export failed."); } const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = window.document.createElement("a"); anchor.href = url; anchor.download = response.headers.get("X-Filename") || `resume.${format}`; anchor.click(); URL.revokeObjectURL(url); toast.success(`${format.toUpperCase()} downloaded`); } catch (error) { toast.error(error instanceof Error ? error.message : "Export failed."); } finally { setLoading(null); } } return <Dialog><DialogTrigger asChild><Button size="sm"><Download aria-hidden />Export</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Export resume</DialogTitle><DialogDescription>Generate a selectable-text document from the current saved revision.</DialogDescription></DialogHeader><div className="grid gap-2 sm:grid-cols-2"><Button variant="outline" disabled={Boolean(loading)} onClick={() => void download("pdf")}>{loading === "pdf" ? <Loader2 aria-hidden className="animate-spin" /> : null}PDF</Button><Button variant="outline" disabled={Boolean(loading)} onClick={() => void download("docx")}>{loading === "docx" ? <Loader2 aria-hidden className="animate-spin" /> : null}DOCX</Button></div></DialogContent></Dialog>; }

export function ResumePreview({ document, profile }: { document: ResumeDocumentV1; profile: CareerProfileV1 & { email?: string | null } }) { return <ResumePrintDocument model={createResumeRenderModel(document, profile)} />; }
function approximatePageCount(document: ResumeDocumentV1, profile: CareerProfileV1) { const content = JSON.stringify({ document, profile }); const density = getResumeTemplate(document.presentation.templateId).density === "compact" ? 4300 : getResumeTemplate(document.presentation.templateId).density === "relaxed" ? 3000 : 3600; const scale = document.presentation.fontScale * (document.presentation.lineHeight / 1.2) * (document.presentation.marginsPt.top / 36); return Math.max(1, Math.ceil(content.length * scale / density)); }
