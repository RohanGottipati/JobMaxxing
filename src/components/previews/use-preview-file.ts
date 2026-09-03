"use client";

import { useCallback, useEffect, useState } from "react";

type PreviewFileState =
  | { status: "loading" }
  | { status: "ready"; bytes: Uint8Array }
  | { status: "error"; message: string };

/**
 * Private files are streamed from the app, so the bytes are fetched once here
 * and handed to whichever renderer the view needs. Fetching ourselves (instead
 * of pointing a viewer at the URL) keeps loading, retry, and error states
 * identical for PDF and DOCX.
 */
export function usePreviewFile(href: string | null) {
  const [state, setState] = useState<PreviewFileState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!href) return;
    let active = true;
    const controller = new AbortController();

    void (async () => {
      setState({ status: "loading" });
      try {
        const response = await fetch(href, {
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) {
          const message =
            response.status === 404
              ? "This file is no longer available."
              : "The file could not be loaded.";
          throw new Error(message);
        }
        const buffer = await response.arrayBuffer();
        if (active) setState({ status: "ready", bytes: new Uint8Array(buffer) });
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "The file could not be loaded.",
        });
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [href, attempt]);

  const resolvedState: PreviewFileState = !href
    ? { status: "error", message: "No file URL was provided." }
    : state;

  return { state: resolvedState, retry };
}
