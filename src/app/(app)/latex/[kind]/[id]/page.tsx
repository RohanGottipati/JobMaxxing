import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LatexStudio } from "@/components/latex/latex-studio";
import { isLatexDocumentKind } from "@/lib/latex/constants";
import { getLatexDocument } from "@/lib/latex/repository";

export const metadata: Metadata = { title: "LaTeX Studio" };

export default async function LatexDocumentStudioPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  if (!isLatexDocumentKind(kind)) notFound();
  const document = await getLatexDocument(kind, id);
  if (!document) notFound();
  return <LatexStudio document={document} />;
}
