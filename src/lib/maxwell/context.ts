import "server-only";

import { getApplicationById } from "@/lib/applications/repository";
import {
  getCoverLetter,
  getMasterResume,
  getTailoredResume,
} from "@/lib/documents/repository";
import type { MaxwellPageContext } from "@/lib/maxwell/types";

export async function getValidatedMaxwellPageContext(
  context: MaxwellPageContext | undefined,
) {
  if (!context) return "";
  const parts = [`Path: ${context.pathname.slice(0, 500)}`];

  if (context.applicationId) {
    const application = await getApplicationById(context.applicationId);
    if (application) {
      parts.push(`Application: ${JSON.stringify(application)}`);
    }
  }

  if (context.documentId && context.documentKind) {
    const document =
      context.documentKind === "master_resume"
        ? await getMasterResume(context.documentId)
        : context.documentKind === "resume_version"
          ? await getTailoredResume(context.documentId)
          : await getCoverLetter(context.documentId);
    if (document) {
      parts.push(`Document: ${JSON.stringify(document)}`);
    }
  }

  return parts.join("\n");
}
