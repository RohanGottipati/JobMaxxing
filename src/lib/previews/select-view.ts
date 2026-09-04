import type { DocumentPreviewDescriptor, PreviewView } from "@/lib/previews/types";

const VIEW_PRIORITY: Record<PreviewView["type"], number> = {
  pdf: 1,
  structured_resume: 2,
  docx: 3,
  markdown: 4,
  plain_text: 5,
  latex: 6,
};

function viewPriority(view: PreviewView) {
  // An attached PDF is the explicit final export, while a compiled PDF may be
  // a legacy artifact from the retired in-browser compiler.
  if (view.type === "pdf" && view.target === "attachment") return 0;
  return VIEW_PRIORITY[view.type];
}

/**
 * When a document has several representations, show the most faithful rendered
 * output first (compiled or attached PDF, then structured layout, then DOCX)
 * and keep source views behind a tab.
 */
export function selectPreviewViews(descriptor: Pick<DocumentPreviewDescriptor, "views">) {
  return [...descriptor.views].sort(
    (left, right) => viewPriority(left) - viewPriority(right),
  );
}

export function defaultPreviewView(descriptor: Pick<DocumentPreviewDescriptor, "views">) {
  return selectPreviewViews(descriptor)[0] ?? null;
}
