import { tailoringChangesSchema } from "@/lib/job-intelligence/schemas";
import {
  resumeDocumentV1Schema,
  type ResumeDocumentV1,
} from "@/lib/resumes/schema";

/**
 * Applies only explicitly selected, claim-safe tailoring changes to a copy of
 * the source resume. Keeping this transformation separate from persistence
 * makes the safety boundary deterministic and directly testable.
 */
export function applyTailoringChanges(
  source: ResumeDocumentV1,
  rawChanges: unknown,
  selectedIds: string[],
) {
  const changes = tailoringChangesSchema
    .parse(rawChanges)
    .filter(
      (change) =>
        selectedIds.includes(change.id) && !change.unsupportedClaims.length,
    );
  const document = structuredClone(source);

  for (const change of changes) {
    if (change.type === "section_order" && Array.isArray(change.after)) {
      const positions = new Map(
        change.after.map((id, index) => [id, index]),
      );
      document.sections.sort(
        (a, b) =>
          (positions.get(a.id) ?? 999) - (positions.get(b.id) ?? 999),
      );
      continue;
    }

    if (change.type === "skill_order" && Array.isArray(change.after)) {
      const section = document.sections.find(
        (item) => item.id === change.targetId,
      );
      if (section) {
        const positions = new Map(
          change.after.map((id, index) => [id, index]),
        );
        section.entries.sort(
          (a, b) =>
            (positions.get(a.id) ?? 999) - (positions.get(b.id) ?? 999),
        );
      }
      continue;
    }

    const [entryId, bulletId] = change.targetId.split(":");
    const entry = document.sections
      .flatMap((section) => section.entries)
      .find((item) => item.id === entryId);
    if (!entry) continue;

    if (change.type === "bullet_order" && Array.isArray(change.after)) {
      entry.bulletIds = change.after;
    }
    if (
      change.type === "bullet_rewrite" &&
      typeof change.after === "string" &&
      bulletId
    ) {
      entry.textOverrides[bulletId] = change.after;
    }
    if (change.type === "hide_bullet" && bulletId) {
      entry.bulletIds = entry.bulletIds.filter((id) => id !== bulletId);
      entry.hiddenBulletIds = [
        ...new Set([...entry.hiddenBulletIds, bulletId]),
      ];
    }
  }

  return resumeDocumentV1Schema.parse(document);
}
