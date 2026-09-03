import type { LatexDocumentKind } from "@/lib/latex/constants";
import {
  defaultLatexTemplateId,
  getLatexTemplate,
  isLatexTemplateId,
} from "@/lib/latex/templates";

export function resolveLatexCreateSource(input: {
  kind: LatexDocumentKind;
  templateId: string | null;
  pastedSource: string | null;
}) {
  const pasted = input.pastedSource?.trim() ?? "";
  if (pasted) {
    return {
      source: pasted,
      engine: getLatexTemplate(defaultLatexTemplateId(input.kind)).engine,
      templateId: null as string | null,
    };
  }

  const templateId = input.templateId && isLatexTemplateId(input.templateId)
    ? input.templateId
    : defaultLatexTemplateId(input.kind);
  const template = getLatexTemplate(templateId);
  if (!template.kinds.includes(input.kind)) {
    throw new Error("That template cannot be used for this document type.");
  }
  return { source: template.source, engine: template.engine, templateId };
}
