"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, Download, Eye, Lock } from "lucide-react";

import {
  PreviewEmpty,
  PreviewError,
  PreviewLoading,
} from "@/components/previews/preview-states";
import {
  PreviewLatexSourceView,
  PreviewMarkdownView,
  PreviewPlainTextView,
} from "@/components/previews/preview-text-views";
import { ResumePrintDocument } from "@/components/resumes/resume-print-document";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { selectPreviewViews } from "@/lib/previews/select-view";
import {
  previewBinaryPath,
  previewDescriptorPath,
  type DocumentPreviewDescriptor,
  type PreviewKind,
  type PreviewView,
} from "@/lib/previews/types";

// react-pdf and mammoth are large and only needed once a preview is opened.
const PreviewPdfView = dynamic(
  () => import("@/components/previews/preview-pdf-view").then((m) => m.PreviewPdfView),
  { ssr: false, loading: () => <PreviewLoading label="Loading PDF viewer…" /> },
);

const PreviewDocxView = dynamic(
  () => import("@/components/previews/preview-docx-view").then((m) => m.PreviewDocxView),
  { ssr: false, loading: () => <PreviewLoading label="Loading document viewer…" /> },
);

type DescriptorState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; descriptor: DocumentPreviewDescriptor }
  | { status: "error"; message: string };

function ViewBody({
  kind,
  id,
  view,
}: {
  kind: PreviewKind;
  id: string;
  view: PreviewView;
}) {
  if (view.type === "pdf") {
    return (
      <PreviewPdfView
        href={previewBinaryPath(kind, id, view.target)}
        downloadHref={previewBinaryPath(kind, id, view.target, { download: true })}
        fileName={view.fileName}
      />
    );
  }
  if (view.type === "docx") {
    return (
      <PreviewDocxView
        href={previewBinaryPath(kind, id, view.target)}
        downloadHref={previewBinaryPath(kind, id, view.target, { download: true })}
        fileName={view.fileName}
      />
    );
  }
  if (view.type === "structured_resume") {
    return (
      <div className="max-h-[min(70dvh,44rem)] overflow-auto overscroll-contain rounded-lg border border-border bg-neutral-200 p-3 dark:bg-neutral-800">
        <ResumePrintDocument model={view.model} />
      </div>
    );
  }
  if (view.type === "latex") {
    return <PreviewLatexSourceView source={view.source} engine={view.engine} />;
  }
  if (view.type === "markdown") {
    return <PreviewMarkdownView text={view.text} />;
  }
  return <PreviewPlainTextView text={view.text} layout={view.layout} />;
}

export function DocumentPreviewDialog({
  kind,
  id,
  open,
  onOpenChange,
  fallbackTitle,
}: {
  kind: PreviewKind;
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fallbackTitle?: string;
}) {
  const [state, setState] = useState<DescriptorState>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);
  const [activeView, setActiveView] = useState<string | null>(null);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!open) return;

    let active = true;
    const controller = new AbortController();

    void (async () => {
      setState({ status: "loading" });
      try {
        const response = await fetch(previewDescriptorPath(kind, id), {
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "This document is not available to preview."
              : "The preview could not be loaded.",
          );
        }
        const descriptor = (await response.json()) as DocumentPreviewDescriptor;
        if (!active) return;
        const views = selectPreviewViews(descriptor);
        const ordered = { ...descriptor, views };
        setState({ status: "ready", descriptor: ordered });
        setActiveView(views[0]?.id ?? null);
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setState({
          status: "error",
          message:
            error instanceof Error ? error.message : "The preview could not be loaded.",
        });
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [open, kind, id, attempt]);

  const descriptor = open && state.status === "ready" ? state.descriptor : null;
  const title = descriptor?.title ?? fallbackTitle ?? "Document preview";
  const views = useMemo(() => descriptor?.views ?? [], [descriptor]);
  const loading = open && (state.status === "loading" || state.status === "idle");
  const errored = open && state.status === "error" ? state : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] max-w-[min(72rem,calc(100vw-1.5rem))] gap-4 p-4 sm:p-6">
        <DialogHeader className="pr-10">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-base leading-tight sm:text-lg">
            <span className="min-w-0 break-words">{title}</span>
            {descriptor?.locked ? (
              <Badge variant="outline" className="gap-1">
                <Lock aria-hidden className="size-3" />
                Locked
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {descriptor?.subtitle ?? "Preview this document without leaving the page."}
          </DialogDescription>
        </DialogHeader>

        {descriptor?.staleCompiledOutput ? (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/[0.06] px-3 py-2 text-xs leading-5">
            <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
            <span>
              The stored PDF is from an older source revision. Open the project in Overleaf,
              export a current PDF, and attach it to this document.
            </span>
          </p>
        ) : null}

        {loading ? <PreviewLoading /> : null}

        {errored ? (
          <PreviewError message={errored.message} onRetry={retry} />
        ) : null}

        {descriptor && views.length === 0 ? (
          <PreviewEmpty
            title="Nothing to preview yet"
            description="Add content or attach a file, then preview it here."
          />
        ) : null}

        {descriptor && views.length === 1 ? (
          <ViewBody kind={kind} id={id} view={views[0]} />
        ) : null}

        {descriptor && views.length > 1 ? (
          <Tabs
            value={activeView ?? views[0].id}
            onValueChange={setActiveView}
            className="min-w-0"
          >
            <TabsList variant="line" className="flex-wrap">
              {views.map((view) => (
                <TabsTrigger key={view.id} value={view.id}>
                  {view.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {views.map((view) => (
              <TabsContent key={view.id} value={view.id} className="min-w-0">
                <ViewBody kind={kind} id={id} view={view} />
              </TabsContent>
            ))}
          </Tabs>
        ) : null}

        {descriptor && descriptor.downloads.length ? (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {descriptor.downloads.map((download) => (
              <Button key={download.id} asChild variant="outline" size="sm">
                <a href={download.href}>
                  <Download aria-hidden />
                  {download.label}
                </a>
              </Button>
            ))}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Convenience wrapper for the many surfaces that just need a Preview control
 * next to a document; it keeps the dialog's open state local to the row.
 */
export function DocumentPreviewButton({
  kind,
  id,
  title,
  label = "Preview",
  variant = "outline",
  size = "sm",
  iconOnly = false,
  className,
}: {
  kind: PreviewKind;
  id: string;
  title?: string;
  label?: string;
  variant?: "outline" | "ghost" | "secondary";
  size?: "sm" | "icon-sm" | "icon-xs";
  iconOnly?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        aria-label={iconOnly ? `${label} ${title ?? "document"}` : undefined}
        onClick={() => setOpen(true)}
      >
        <Eye aria-hidden />
        {iconOnly ? null : label}
      </Button>
      <DocumentPreviewDialog
        kind={kind}
        id={id}
        open={open}
        onOpenChange={setOpen}
        fallbackTitle={title}
      />
    </>
  );
}
