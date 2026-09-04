import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OverleafWorkspace } from "@/components/latex/overleaf-workspace";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSignedDocumentUrl } from "@/lib/documents/repository";
import { isLatexDocumentKind } from "@/lib/latex/constants";
import {
  buildLatexProjectArchive,
  overleafProjectDataUrl,
} from "@/lib/latex/project-archive";
import { getLatexDocument, readLatexProject } from "@/lib/latex/repository";

export const metadata: Metadata = { title: "Open in Overleaf" };

export default async function LatexOverleafPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  if (!isLatexDocumentKind(kind)) notFound();
  const [document, project, user] = await Promise.all([
    getLatexDocument(kind, id),
    readLatexProject(kind, id),
    requireCurrentUser(),
  ]);
  if (!document || !project) notFound();

  const [archive, signedUrl] = await Promise.all([
    buildLatexProjectArchive(project),
    createSignedDocumentUrl(document.filePath),
  ]);

  return (
    <OverleafWorkspace
      document={document}
      projectDataUrl={overleafProjectDataUrl(archive)}
      userId={user.id}
      signedUrl={signedUrl}
    />
  );
}
