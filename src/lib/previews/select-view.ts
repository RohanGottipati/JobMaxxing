import type { DocumentPreviewDescriptor, PreviewView } from "@/lib/previews/types";

const VIEW_PRIORITY: Record<PreviewView["type"], number> = {
  pdf: 0,
  structured_resume: 1,
  docx: 2,
  markdown: 3,
  plain_text: 4,
  latex: 5,
};

/**
 * When a document has several representations, show the most faithful rendered
 * output first (compiled or attached PDF, then structured layout, then DOCX)
 * and keep source views behind a tab.
 */
export function selectPreviewViews(descriptor: Pick<DocumentPreviewDescriptor, "views">) {
  return [...descriptor.views].sort(
    (left, right) => VIEW_PRIORITY[left.type] - VIEW_PRIORITY[right.type],
  );
}

export function defaultPreviewView(descriptor: Pick<DocumentPreviewDescriptor, "views">) {
  return selectPreviewViews(descriptor)[0] ?? null;
}
