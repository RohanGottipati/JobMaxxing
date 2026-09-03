export type LatexLogSeverity = "error" | "warning" | "info";

export type LatexLogEntry = {
  severity: LatexLogSeverity;
  message: string;
  /** 1-based line in the user's source, when TeX reported one. */
  line: number | null;
  file: string | null;
};

const ERROR_WITH_LINE = /^(?:!\s*)?(?:LaTeX|Package|Class)?\s*(?:Error:?\s*)?.*?\bl\.(\d+)\b/;
const TEX_ERROR = /^!\s?(.*)$/;
const LINE_MARKER = /^l\.(\d+)\s?(.*)$/;
const PACKAGE_WARNING = /^(?:LaTeX|Package|Class)\s+(?:(\S+)\s+)?Warning:\s*(.*)$/;
const LINE_SUFFIX = /\bon input line (\d+)/;
const FILE_PUSH = /\((\.\/|\/)?([^()\s]+\.(?:tex|sty|cls|bib|bst))/;

function pushEntry(entries: LatexLogEntry[], entry: LatexLogEntry) {
  const previous = entries.at(-1);
  if (previous && previous.severity === entry.severity && previous.message === entry.message) {
    return;
  }
  entries.push(entry);
}

/**
 * TeX logs are line-oriented but errors span several lines: the `!` line
 * carries the message and a later `l.<n>` line carries the position. This walks
 * the log keeping the most recent error open until its line marker arrives, so
 * the editor can jump to the offending line.
 */
export function parseLatexLog(log: string): LatexLogEntry[] {
  const entries: LatexLogEntry[] = [];
  const lines = log.split(/\r?\n/);
  let currentFile: string | null = null;
  let openError: LatexLogEntry | null = null;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) continue;

    const filePush = FILE_PUSH.exec(line);
    if (filePush) currentFile = filePush[2];

    const lineMarker = LINE_MARKER.exec(line);
    if (lineMarker && openError) {
      openError.line = Number(lineMarker[1]);
      openError = null;
      continue;
    }

    const texError = TEX_ERROR.exec(line);
    if (texError) {
      const inlineLine = ERROR_WITH_LINE.exec(line);
      const entry: LatexLogEntry = {
        severity: "error",
        message: texError[1].trim() || "LaTeX reported an error.",
        line: inlineLine ? Number(inlineLine[1]) : null,
        file: currentFile,
      };
      pushEntry(entries, entry);
      openError = entry.line === null ? entry : null;
      continue;
    }

    const warning = PACKAGE_WARNING.exec(line);
    if (warning) {
      const suffix = LINE_SUFFIX.exec(line);
      pushEntry(entries, {
        severity: "warning",
        message: [warning[1], warning[2]].filter(Boolean).join(": ").trim(),
        line: suffix ? Number(suffix[1]) : null,
        file: currentFile,
      });
      continue;
    }

    if (/^(Overfull|Underfull)\s\\[hv]box/.test(line)) {
      const suffix = /at lines? (\d+)/.exec(line);
      pushEntry(entries, {
        severity: "info",
        message: line,
        line: suffix ? Number(suffix[1]) : null,
        file: currentFile,
      });
    }
  }

  return entries;
}

export function summarizeLatexLog(entries: LatexLogEntry[]) {
  return {
    errors: entries.filter((entry) => entry.severity === "error").length,
    warnings: entries.filter((entry) => entry.severity === "warning").length,
    infos: entries.filter((entry) => entry.severity === "info").length,
  };
}
