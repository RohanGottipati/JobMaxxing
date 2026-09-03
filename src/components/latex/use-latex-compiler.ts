"use client";

import { useRef } from "react";

import { parseLatexLog, type LatexLogEntry } from "@/lib/latex/logs";
import { latexRuntimeProbeUrl, latexRuntimeUrls } from "@/lib/latex/runtime";
import type { LatexEngine } from "@/types/database";

export type LatexCompileOutcome = {
  ok: boolean;
  pdf: Uint8Array | null;
  log: string;
  entries: LatexLogEntry[];
  error: string | null;
  cancelled: boolean;
};

function toBytes(value: Uint8Array) {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy;
}

export function useLatexCompiler() {
  const compilerRef = useRef<{
    compile: (
      source: string,
      options?: { engine?: string; additionalFiles?: Record<string, string | Uint8Array> },
    ) => Promise<{ success: boolean; pdf?: Uint8Array; log?: string; error?: string }>;
    terminate: () => void;
    init: () => Promise<void>;
  } | null>(null);
  const generation = useRef(0);

  async function ensureCompiler(
    onLog: (message: string) => void,
    onProgress: (stage: string, detail: string) => void,
  ) {
    if (compilerRef.current) return compilerRef.current;
    const { SiglumCompiler } = await import("@siglum/engine");
    const urls = latexRuntimeUrls();
    const compiler = new SiglumCompiler({
      ...urls,
      enableCtan: false,
      enableDocCache: true,
      enableLazyFS: true,
      onLog,
      onProgress,
    });
    await compiler.init();
    compilerRef.current = compiler;
    return compiler;
  }

  async function compile(input: {
    source: string;
    engine: LatexEngine;
    files: Record<string, Uint8Array>;
    onLog?: (message: string) => void;
    onProgress?: (stage: string, detail: string) => void;
  }): Promise<LatexCompileOutcome> {
    const token = ++generation.current;
    try {
      const probe = await fetch(latexRuntimeProbeUrl(), { method: "HEAD", cache: "no-store" });
      if (!probe.ok) {
        return {
          ok: false,
          pdf: null,
          log: "",
          entries: [],
          cancelled: false,
          error:
            "The TeX Live runtime is not installed on this server. An operator needs to run npm run latex:assets.",
        };
      }

      const compiler = await ensureCompiler(
        (message) => {
          if (token === generation.current) input.onLog?.(message);
        },
        (stage, detail) => {
          if (token === generation.current) input.onProgress?.(stage, detail);
        },
      );
      if (token !== generation.current) {
        return { ok: false, pdf: null, log: "", entries: [], error: null, cancelled: true };
      }

      const result = await compiler.compile(input.source, {
        engine: input.engine,
        additionalFiles: input.files,
        useCache: false,
      });
      if (token !== generation.current) {
        return { ok: false, pdf: null, log: "", entries: [], error: null, cancelled: true };
      }

      const log = result.log ?? "";
      return {
        ok: Boolean(result.success && result.pdf),
        pdf: result.pdf ? toBytes(result.pdf) : null,
        log,
        entries: parseLatexLog(log),
        error: result.success ? null : result.error ?? "Compilation failed.",
        cancelled: false,
      };
    } catch (error) {
      if (token !== generation.current) {
        return { ok: false, pdf: null, log: "", entries: [], error: null, cancelled: true };
      }
      return {
        ok: false,
        pdf: null,
        log: "",
        entries: [],
        cancelled: false,
        error: error instanceof Error ? error.message : "Compilation failed.",
      };
    }
  }

  function cancel() {
    generation.current += 1;
    compilerRef.current?.terminate();
    compilerRef.current = null;
  }

  return { compile, cancel };
}
