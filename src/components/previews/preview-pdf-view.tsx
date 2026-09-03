"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

import {
  PreviewError,
  PreviewLoading,
} from "@/components/previews/preview-states";
import { usePreviewFile } from "@/components/previews/use-preview-file";
import { Button } from "@/components/ui/button";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// The worker is copied into `public/` by scripts/copy-runtime-workers.mjs so
// its version always matches the installed pdfjs-dist.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const;
const DEFAULT_ZOOM_INDEX = 2;

export function PreviewPdfView({
  href,
  bytes,
  downloadHref,
  fileName,
  onDownload,
}: {
  href?: string | null;
  bytes?: Uint8Array | null;
  downloadHref: string;
  fileName: string;
  onDownload?: () => void;
}) {
  const { state, retry } = usePreviewFile(href ?? null);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(720);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      // Leave room for the scrollbar so the page never triggers a horizontal
      // scroll at the default zoom.
      setContainerWidth(Math.max(240, entry.contentRect.width - 24));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const file = useMemo(() => {
    if (bytes) return { data: bytes };
    return state.status === "ready" ? { data: state.bytes } : null;
  }, [bytes, state]);

  const zoom = ZOOM_STEPS[zoomIndex];

  const handleLoad = useCallback(({ numPages }: { numPages: number }) => {
    setPageCount(numPages);
    setPage((current) => Math.min(current, numPages));
    setRenderError(null);
  }, []);

  if (!bytes && state.status === "loading") return <PreviewLoading label="Loading PDF…" />;
  if (!bytes && state.status === "error") {
    return <PreviewError message={state.message} onRetry={retry} />;
  }
  if (renderError) return <PreviewError message={renderError} onRetry={retry} />;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-parchment/40 px-2 py-1.5">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <span aria-live="polite" className="min-w-24 text-center text-xs text-muted-foreground">
            Page {page} of {pageCount || "…"}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next page"
            disabled={pageCount === 0 || page >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom out"
            disabled={zoomIndex === 0}
            onClick={() => setZoomIndex((current) => Math.max(0, current - 1))}
          >
            <ZoomOut aria-hidden />
          </Button>
          <span className="min-w-12 text-center text-xs text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom in"
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
            onClick={() =>
              setZoomIndex((current) => Math.min(ZOOM_STEPS.length - 1, current + 1))
            }
          >
            <ZoomIn aria-hidden />
          </Button>
          {onDownload ? (
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download aria-hidden />
              Download
            </Button>
          ) : downloadHref ? (
            <Button asChild variant="outline" size="sm">
              <a href={downloadHref} download={fileName}>
                <Download aria-hidden />
                Download
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div
        ref={containerRef}
        className="max-h-[min(70dvh,44rem)] overflow-auto overscroll-contain rounded-lg border border-border bg-neutral-200 p-3 dark:bg-neutral-800"
      >
        <Document
          file={file ?? undefined}
          onLoadSuccess={handleLoad}
          onLoadError={() => setRenderError("This PDF could not be rendered.")}
          loading={<PreviewLoading label="Rendering PDF…" />}
          error={<PreviewError message="This PDF could not be rendered." onRetry={retry} />}
          className="grid justify-center"
        >
          <Page
            pageNumber={page}
            width={containerWidth * zoom}
            renderAnnotationLayer
            renderTextLayer
            className="mx-auto shadow-lg"
            loading={<PreviewLoading label="Rendering page…" />}
          />
        </Document>
      </div>
    </div>
  );
}
