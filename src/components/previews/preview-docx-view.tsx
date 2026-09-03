"use client";

import { useEffect, useState } from "react";
import { Download, Info } from "lucide-react";

import {
  PreviewEmpty,
  PreviewError,
  PreviewLoading,
} from "@/components/previews/preview-states";
import { usePreviewFile } from "@/components/previews/use-preview-file";
import { Button } from "@/components/ui/button";
import { sanitizeDocumentHtml } from "@/lib/previews/sanitize-html";

export function PreviewDocxView({
  href,
  downloadHref,
  fileName,
}: {
  href: string;
  downloadHref: string;
  fileName: string;
}) {
  const { state, retry } = usePreviewFile(href);
  const [html, setHtml] = useState<string | null>(null);
  const [conversionError, setConversionError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status !== "ready") return;
    let active = true;

    void (async () => {
      setHtml(null);
      setConversionError(null);
      try {
        const mammoth = (await import("mammoth")).default;
        // `bytes` is a view over the fetched buffer; mammoth wants the buffer.
        const result = await mammoth.convertToHtml({
          arrayBuffer: state.bytes.slice().buffer as ArrayBuffer,
        });
        if (active) setHtml(sanitizeDocumentHtml(result.value));
      } catch {
        if (active) setConversionError("This DOCX file could not be converted for preview.");
      }
    })();

    return () => {
      active = false;
    };
  }, [state]);

  if (state.status === "loading") return <PreviewLoading label="Loading document…" />;
  if (state.status === "error") {
    return <PreviewError message={state.message} onRetry={retry} />;
  }
  if (conversionError) return <PreviewError message={conversionError} onRetry={retry} />;
  if (html === null) return <PreviewLoading label="Converting document…" />;
  if (!html.trim()) {
    return (
      <PreviewEmpty
        title="No readable content"
        description="This DOCX file has no text we can render. Download it to open in a document editor."
      />
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-parchment/40 px-3 py-2">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info aria-hidden className="size-3.5 shrink-0" />
          Structure preview. Word pagination, spacing, and fonts may differ.
        </p>
        <Button asChild variant="outline" size="sm">
          <a href={downloadHref} download={fileName}>
            <Download aria-hidden />
            Download
          </a>
        </Button>
      </div>

      <div className="max-h-[min(70dvh,44rem)] overflow-auto overscroll-contain rounded-lg border border-border bg-neutral-200 p-3 dark:bg-neutral-800">
        <article
          className="docx-preview mx-auto w-full max-w-[8.5in] bg-white p-[0.9in] text-neutral-900 shadow-lg"
          // Converted by mammoth, then sanitized to a fixed allowlist.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
