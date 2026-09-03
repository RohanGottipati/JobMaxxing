"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Download,
  FileArchive,
  FileCode2,
  History,
  Loader2,
  Play,
  Square,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { LatexSourceEditor, type LatexSourceEditorHandle } from "@/components/latex/latex-source-editor";
import { useLatexCompiler } from "@/components/latex/use-latex-compiler";
import { PreviewEmpty, PreviewError, PreviewLoading } from "@/components/previews/preview-states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LATEX_ASSET_ACCEPT, validateLatexAsset } from "@/lib/latex/asset-policy";
import { LATEX_AUTOSAVE_DEBOUNCE_MS, LATEX_ENGINE_LABELS } from "@/lib/latex/constants";
import type { LatexLogEntry } from "@/lib/latex/logs";
import { summarizeLatexLog } from "@/lib/latex/logs";
import type { LatexEditorDTO } from "@/lib/latex/types";
import { previewBinaryPath } from "@/lib/previews/types";
import type { LatexEngine } from "@/types/database";

const PreviewPdfView = dynamic(
  () => import("@/components/previews/preview-pdf-view").then((module) => module.PreviewPdfView),
  { ssr: false, loading: () => <PreviewLoading label="Loading PDF viewer…" /> },
);

type SaveState = "saved" | "unsaved" | "saving" | "offline" | "conflict" | "failed";
type CompileState = "idle" | "saving" | "running" | "success" | "error";

function apiPath(kind: LatexEditorDTO["kind"], id: string, suffix = "") {
  return `/api/latex-documents/${kind}/${id}${suffix}`;
}

function downloadBytes(bytes: Uint8Array, fileName: string, type: string) {
  const blob = new Blob([bytes as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function LatexStudio({ document: initial }: { document: LatexEditorDTO }) {
  const [title, setTitle] = useState(initial.title);
  const [source, setSource] = useState(initial.source);
  const [engine, setEngine] = useState<LatexEngine>(initial.engine);
  const [rowVersion, setRowVersion] = useState(initial.rowVersion);
  const [assets, setAssets] = useState(initial.assets);
  const [history, setHistory] = useState(initial.history);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [compileState, setCompileState] = useState<CompileState>("idle");
  const [progress, setProgress] = useState("Ready to compile");
  const [log, setLog] = useState("");
  const [entries, setEntries] = useState<LatexLogEntry[]>([]);
  const [localPdf, setLocalPdf] = useState<Uint8Array | null>(null);
  const [compiledFresh, setCompiledFresh] = useState(initial.compiled?.fresh ?? false);
  const [staleRemote, setStaleRemote] = useState(Boolean(initial.compiled && !initial.compiled.fresh));
  const [mobileTab, setMobileTab] = useState("editor");
  const isolated = typeof crossOriginIsolated === "undefined" || crossOriginIsolated;

  const editorRef = useRef<LatexSourceEditorHandle>(null);
  const latestVersion = useRef(initial.rowVersion);
  const baseline = useRef(JSON.stringify({ title: initial.title, source: initial.source, engine: initial.engine }));
  const saving = useRef(false);
  const storageKey = `jobmaxxing:latex-draft:${initial.kind}:${initial.id}`;
  const { compile, cancel } = useLatexCompiler();

  const saveNow = useCallback(async () => {
    if (initial.locked || saving.current) return latestVersion.current;
    const serialized = JSON.stringify({ title, source, engine });
    if (serialized === baseline.current) return latestVersion.current;
    saving.current = true;
    setSaveState("saving");
    try {
      const response = await fetch(apiPath(initial.kind, initial.id), {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(latestVersion.current),
        },
        body: JSON.stringify({ title, source, engine }),
      });
      const body = await response.json();
      if (response.status === 409) {
        setSaveState("conflict");
        throw new Error("conflict");
      }
      if (!response.ok) throw new Error(body.error?.message ?? "Save failed.");
      latestVersion.current = body.rowVersion;
      setRowVersion(body.rowVersion);
      baseline.current = serialized;
      sessionStorage.removeItem(storageKey);
      setSaveState("saved");
      setCompiledFresh(false);
      setStaleRemote(true);
      return body.rowVersion as number;
    } catch (error) {
      if (error instanceof Error && error.message === "conflict") throw error;
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ savedAt: Date.now(), rowVersion: latestVersion.current, title, source, engine }),
      );
      setSaveState(navigator.onLine ? "failed" : "offline");
      throw error;
    } finally {
      saving.current = false;
    }
  }, [engine, initial.id, initial.kind, initial.locked, source, storageKey, title]);

  useEffect(() => {
    const serialized = JSON.stringify({ title, source, engine });
    if (serialized === baseline.current || initial.locked || saveState === "conflict") return;
    setSaveState("unsaved");
    const timeout = window.setTimeout(() => {
      void saveNow().catch(() => undefined);
    }, LATEX_AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [engine, initial.locked, saveNow, saveState, source, title]);

  useEffect(() => {
    const draft = sessionStorage.getItem(storageKey);
    if (!draft) return;
    try {
      const parsed = JSON.parse(draft) as {
        savedAt: number;
        rowVersion: number;
        title: string;
        source: string;
        engine: LatexEngine;
      };
      if (Date.now() - parsed.savedAt < 86_400_000 && parsed.rowVersion === initial.rowVersion) {
        // Recover a same-revision draft written before an unexpected reload.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage hydrate
        setTitle(parsed.title);
        setSource(parsed.source);
        setEngine(parsed.engine);
        setSaveState("unsaved");
        toast.info("Recovered an unsaved draft from this tab.");
      } else sessionStorage.removeItem(storageKey);
    } catch {
      sessionStorage.removeItem(storageKey);
    }
  }, [initial.rowVersion, storageKey]);

  async function runCompile() {
    if (initial.locked || compileState === "running" || compileState === "saving") return;
    setCompileState("saving");
    setProgress("Saving source…");
    try {
      const version = await saveNow();
      setCompileState("running");
      setProgress("Loading compiler…");
      const files: Record<string, Uint8Array> = {};
      await Promise.all(
        assets.map(async (asset) => {
          const response = await fetch(apiPath(initial.kind, initial.id, `/assets/${asset.id}`), {
            credentials: "same-origin",
          });
          if (response.ok) files[asset.fileName] = new Uint8Array(await response.arrayBuffer());
        }),
      );
      const result = await compile({
        source,
        engine,
        files,
        onLog: () => undefined,
        onProgress: (stage, detail) => setProgress(`${stage}${detail ? ` · ${detail}` : ""}`),
      });
      if (result.cancelled) {
        setCompileState("idle");
        setProgress("Compile cancelled");
        return;
      }
      setLog(result.log);
      setEntries(result.entries);
      if (!result.ok || !result.pdf) {
        setCompileState("error");
        setProgress(result.error ?? "Compilation failed");
        const firstError = result.entries.find((entry) => entry.severity === "error" && entry.line);
        if (firstError?.line) editorRef.current?.focusLine(firstError.line);
        return;
      }
      setLocalPdf(result.pdf);
      const upload = await fetch(apiPath(initial.kind, initial.id, "/compiled-pdf"), {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/pdf",
          "X-Source-Version": String(version),
        },
        body: result.pdf as unknown as BodyInit,
      });
      if (upload.status === 409) {
        toast.warning("The source changed during compile. The PDF is kept locally.");
        setCompiledFresh(false);
        setStaleRemote(true);
      } else if (!upload.ok) {
        toast.error("Compiled locally, but the PDF could not be stored.");
      } else {
        setCompiledFresh(true);
        setStaleRemote(false);
      }
      setCompileState("success");
      setProgress("Compiled");
      setMobileTab("preview");
    } catch {
      setCompileState("error");
      setProgress(saveState === "conflict" ? "Save conflict" : "Could not compile");
    }
  }

  async function uploadAsset(file: File | undefined) {
    if (!file || initial.locked) return;
    const quotaError = validateLatexAsset(file, {
      count: assets.length,
      totalBytes: assets.reduce((sum, asset) => sum + asset.sizeBytes, 0),
    });
    if (quotaError) {
      toast.error(quotaError);
      return;
    }
    const body = new FormData();
    body.append("file", file);
    const response = await fetch(apiPath(initial.kind, initial.id, "/assets"), {
      method: "POST",
      credentials: "same-origin",
      headers: { "If-Match": String(latestVersion.current) },
      body,
    });
    const payload = await response.json();
    if (!response.ok) {
      toast.error(payload.error?.message ?? "Could not attach that file.");
      return;
    }
    latestVersion.current = payload.rowVersion;
    setRowVersion(payload.rowVersion);
    setCompiledFresh(false);
    setStaleRemote(true);
    const refreshed = await fetch(apiPath(initial.kind, initial.id), { credentials: "same-origin" });
    if (refreshed.ok) {
      const next = (await refreshed.json()) as LatexEditorDTO;
      setAssets(next.assets);
    }
    toast.success("Asset attached");
  }

  async function removeAsset(assetId: string) {
    const response = await fetch(apiPath(initial.kind, initial.id, `/assets/${assetId}`), {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "If-Match": String(latestVersion.current) },
    });
    const payload = await response.json();
    if (!response.ok) {
      toast.error(payload.error?.message ?? "Could not remove that asset.");
      return;
    }
    latestVersion.current = payload.rowVersion;
    setRowVersion(payload.rowVersion);
    setAssets((current) => current.filter((asset) => asset.id !== assetId));
    setCompiledFresh(false);
    setStaleRemote(true);
  }

  async function checkpoint() {
    await saveNow();
    const response = await fetch(apiPath(initial.kind, initial.id, "/checkpoints"), {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedVersion: latestVersion.current, reason: "manual" }),
    });
    if (response.ok) {
      toast.success("Checkpoint saved");
      const refreshed = await fetch(apiPath(initial.kind, initial.id), { credentials: "same-origin" });
      if (refreshed.ok) setHistory(((await refreshed.json()) as LatexEditorDTO).history);
    } else toast.error("Could not save a checkpoint");
  }

  async function restore(historyId: string) {
    const response = await fetch(apiPath(initial.kind, initial.id, "/restore"), {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedVersion: latestVersion.current, historyId }),
    });
    if (!response.ok) {
      const body = await response.json();
      toast.error(body.error?.message ?? "Could not restore that version.");
      return;
    }
    window.location.reload();
  }

  const saveLabel = {
    saved: "Saved",
    unsaved: "Unsaved",
    saving: "Saving…",
    offline: "Offline draft",
    conflict: "Save conflict",
    failed: "Save failed",
  }[saveState];
  const counts = summarizeLatexLog(entries);
  const storedPdfHref = compiledFresh || staleRemote
    ? previewBinaryPath(initial.kind, initial.id, "compiled")
    : null;

  const preview = (
    <div className="grid min-h-0 flex-1 gap-3">
      {staleRemote && !localPdf ? (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/[0.06] px-3 py-2 text-xs leading-5">
          <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
          The stored PDF is from an older revision. Compile again to refresh it.
        </p>
      ) : null}
      {localPdf ? (
        <PreviewPdfView
          bytes={localPdf}
          downloadHref=""
          fileName={`${title || "document"}.pdf`}
          onDownload={() => downloadBytes(localPdf, `${title || "document"}.pdf`, "application/pdf")}
        />
      ) : storedPdfHref ? (
        <PreviewPdfView
          href={storedPdfHref}
          downloadHref={previewBinaryPath(initial.kind, initial.id, "compiled", { download: true })}
          fileName={`${title || "document"}.pdf`}
        />
      ) : compileState === "running" ? (
        <PreviewLoading label={progress} />
      ) : compileState === "error" ? (
        <PreviewError message={progress} onRetry={() => void runCompile()} />
      ) : (
        <PreviewEmpty
          title="No PDF yet"
          description="Press Compile or Ctrl/Cmd+Enter. The first run downloads the TeX Live runtime into this browser."
        />
      )}
    </div>
  );

  const logs = (
    <div className="grid min-h-0 flex-1 gap-2 overflow-auto">
      {entries.length ? (
        <ul className="grid gap-1">
          {entries.map((entry, index) => (
            <li key={`${entry.message}-${index}`}>
              <button
                type="button"
                className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                onClick={() => entry.line && editorRef.current?.focusLine(entry.line)}
              >
                <Badge variant={entry.severity === "error" ? "destructive" : "secondary"} className="mt-0.5">
                  {entry.severity}
                </Badge>
                <span className="min-w-0 flex-1">
                  <span className="block">{entry.message}</span>
                  {entry.line ? (
                    <span className="text-muted-foreground">Line {entry.line}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Compile to see errors, warnings, and overfull boxes.</p>
      )}
      {log ? (
        <pre className="overflow-auto rounded-lg border border-border bg-parchment/40 p-3 font-mono text-[0.7rem] leading-5">
          {log}
        </pre>
      ) : null}
    </div>
  );

  return (
    <div className="flex h-svh min-h-0 flex-col bg-background">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-sidebar/95 px-3 py-2 sm:px-4">
        <a
          href={initial.returnHref}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft aria-hidden className="size-4" />
        </a>
        <a href="/dashboard" className="hidden items-center sm:inline-flex" aria-label="JobMaxxing home">
          <BrandMark className="size-7" />
        </a>
        <Input
          aria-label="Document title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setSaveState("unsaved");
          }}
          disabled={initial.locked}
          className="h-8 max-w-xs font-semibold"
        />
        <Select
          aria-label="TeX engine"
          value={engine}
          disabled={initial.locked}
          onChange={(event) => {
            setEngine(event.target.value as LatexEngine);
            setSaveState("unsaved");
          }}
          className="h-8 w-36"
        >
          {Object.entries(LATEX_ENGINE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Badge variant={saveState === "failed" || saveState === "conflict" ? "destructive" : "outline"} aria-live="polite">
          {saveState === "saving" ? <Loader2 aria-hidden className="mr-1 size-3 animate-spin" /> : saveState === "saved" ? <Check aria-hidden className="mr-1 size-3" /> : null}
          {saveLabel}
        </Badge>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {compileState === "running" ? (
            <Button variant="outline" size="sm" onClick={cancel}>
              <Square aria-hidden />
              Cancel
            </Button>
          ) : (
            <Button size="sm" onClick={() => void runCompile()} disabled={initial.locked || saveState === "conflict"}>
              <Play aria-hidden />
              Compile
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => void checkpoint()} disabled={initial.locked}>
            <History aria-hidden />
            Save version
          </Button>
        </div>
      </header>

      {!isolated ? (
        <Alert variant="destructive" className="rounded-none border-x-0">
          <AlertDescription>
            This tab is not cross-origin isolated, so the compiler cannot use SharedArrayBuffer. Reload Studio from the
            sidebar instead of using in-app navigation.
          </AlertDescription>
        </Alert>
      ) : null}
      {saveState === "conflict" ? (
        <Alert variant="destructive" className="rounded-none border-x-0">
          <AlertDescription>
            This document changed in another session. Your draft is preserved in this tab.{" "}
            <Button variant="link" className="h-auto p-0" onClick={() => window.location.reload()}>
              Reload current version
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {initial.locked ? (
        <Alert className="rounded-none border-x-0">
          <AlertDescription>This submitted version is locked. Duplicate it from the library to keep editing.</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col xl:grid xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
        <section className="flex min-h-0 min-w-0 flex-col gap-3 p-3">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <FileCode2 aria-hidden className="size-3.5" />
              main.tex · v{rowVersion}
            </span>
            <span aria-live="polite">{progress}</span>
          </div>
          <div className="min-h-0 flex-1 xl:block">
            <div className="hidden h-full xl:block">
              <LatexSourceEditor
                ref={editorRef}
                value={source}
                readOnly={initial.locked}
                onChange={(value) => {
                  setSource(value);
                  setSaveState("unsaved");
                }}
                onCompile={() => void runCompile()}
              />
            </div>
            <Tabs value={mobileTab} onValueChange={setMobileTab} className="xl:hidden">
              <TabsList>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="logs">Logs {counts.errors ? `(${counts.errors})` : ""}</TabsTrigger>
              </TabsList>
              <TabsContent value="editor" className="h-[min(70dvh,40rem)]">
                <LatexSourceEditor
                  ref={editorRef}
                  value={source}
                  readOnly={initial.locked}
                  onChange={(value) => {
                    setSource(value);
                    setSaveState("unsaved");
                  }}
                  onCompile={() => void runCompile()}
                />
              </TabsContent>
              <TabsContent value="preview">{preview}</TabsContent>
              <TabsContent value="logs">{logs}</TabsContent>
            </Tabs>
          </div>
        </section>

        <aside className="hidden min-h-0 flex-col gap-4 overflow-auto border-l border-border p-3 xl:flex">
          <Tabs defaultValue="preview">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="logs">Logs {counts.errors ? `(${counts.errors})` : ""}</TabsTrigger>
            </TabsList>
            <TabsContent value="preview">{preview}</TabsContent>
            <TabsContent value="logs">{logs}</TabsContent>
          </Tabs>

          <section className="grid gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Assets</h2>
              <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-primary">
                <UploadCloud aria-hidden className="size-3.5" />
                Add
                <input
                  type="file"
                  accept={LATEX_ASSET_ACCEPT}
                  className="sr-only"
                  disabled={initial.locked}
                  onChange={(event) => {
                    void uploadAsset(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            {assets.length ? (
              <ul className="grid gap-1">
                {assets.map((asset) => (
                  <li key={asset.id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs">
                    <span className="min-w-0 flex-1 truncate">{asset.fileName}</span>
                    {!initial.locked ? (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove ${asset.fileName}`}
                        onClick={() => void removeAsset(asset.id)}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">PNG, JPEG, PDF, fonts, and .cls/.sty/.bib/.bst files. 20 files, 5 MB each.</p>
            )}
          </section>

          <section className="grid gap-2">
            <h2 className="text-sm font-semibold">History</h2>
            {history.length ? (
              <ul className="grid gap-1">
                {history.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-2 text-xs">
                    <span>
                      v{entry.rowVersion} · {entry.reason}
                    </span>
                    {!initial.locked ? (
                      <Button variant="ghost" size="xs" onClick={() => void restore(entry.id)}>
                        Restore
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Automatic checkpoints appear at most every five minutes.</p>
            )}
          </section>

          <section className="grid gap-2">
            <h2 className="text-sm font-semibold">Download</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadBytes(new TextEncoder().encode(source), "main.tex", "application/x-tex")}
              >
                <FileCode2 aria-hidden />
                .tex
              </Button>
              {localPdf ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadBytes(localPdf, `${title || "document"}.pdf`, "application/pdf")}
                >
                  <Download aria-hidden />
                  PDF
                </Button>
              ) : null}
              {initial.hasAttachment ? (
                <Button asChild variant="outline" size="sm">
                  <a href={previewBinaryPath(initial.kind, initial.id, "attachment", { download: true })}>
                    <Download aria-hidden />
                    Original
                  </a>
                </Button>
              ) : null}
              <Button asChild variant="outline" size="sm">
                <a href={apiPath(initial.kind, initial.id, "/project")}>
                  <FileArchive aria-hidden />
                  Project ZIP
                </a>
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
