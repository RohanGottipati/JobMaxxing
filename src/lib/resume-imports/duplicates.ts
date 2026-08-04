import type { CareerProfileV1 } from "@/lib/career/schemas";
import type { DuplicateDecisions, ResumeImportResult } from "@/lib/resume-imports/schemas";

function fill(existing: string, imported: string) {
  return existing.trim() ? existing : imported;
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function mergeEvidenceItem<T extends CareerProfileV1["experiences"][number] | CareerProfileV1["projects"][number]>(existing: T, imported: T): T {
  const bulletTexts = new Set(existing.bullets.map((bullet) => bullet.approvedText.trim().toLocaleLowerCase()));
  return {
    ...existing,
    originalText: fill(existing.originalText, imported.originalText),
    approvedText: fill(existing.approvedText, imported.approvedText),
    technologies: unique([...existing.technologies, ...imported.technologies]),
    demonstratedSkills: unique([...existing.demonstratedSkills, ...imported.demonstratedSkills]),
    metrics: unique([...existing.metrics, ...imported.metrics]),
    bullets: [
      ...existing.bullets,
      ...imported.bullets.filter((bullet) => !bulletTexts.has(bullet.approvedText.trim().toLocaleLowerCase())),
    ],
  };
}

export function applyDuplicateDecisions(
  profile: CareerProfileV1,
  duplicates: ResumeImportResult["duplicates"],
  decisions: DuplicateDecisions,
) {
  const next = structuredClone(profile);
  for (const duplicate of duplicates) {
    const decision = decisions[duplicate.importedId] ?? "keep_existing";
    if (decision === "keep_existing") continue;

    if (duplicate.kind === "experience") {
      if (decision === "create_separate") next.experiences.push(duplicate.candidate);
      else next.experiences = next.experiences.map((item) => item.id === duplicate.existingId
        ? {
            ...mergeEvidenceItem(item, duplicate.candidate),
            jobTitle: fill(item.jobTitle, duplicate.candidate.jobTitle),
            company: fill(item.company, duplicate.candidate.company),
            location: fill(item.location, duplicate.candidate.location),
            startDate: fill(item.startDate, duplicate.candidate.startDate),
            endDate: fill(item.endDate, duplicate.candidate.endDate),
          }
        : item);
    } else if (duplicate.kind === "education") {
      if (decision === "create_separate") next.education.push(duplicate.candidate);
      else next.education = next.education.map((item) => item.id === duplicate.existingId ? {
        ...item,
        school: fill(item.school, duplicate.candidate.school),
        degree: fill(item.degree, duplicate.candidate.degree),
        field: fill(item.field, duplicate.candidate.field),
        location: fill(item.location, duplicate.candidate.location),
        startDate: fill(item.startDate, duplicate.candidate.startDate),
        endDate: fill(item.endDate, duplicate.candidate.endDate),
        details: fill(item.details, duplicate.candidate.details),
      } : item);
    } else if (duplicate.kind === "project") {
      if (decision === "create_separate") next.projects.push(duplicate.candidate);
      else next.projects = next.projects.map((item) => item.id === duplicate.existingId ? {
        ...mergeEvidenceItem(item, duplicate.candidate),
        title: fill(item.title, duplicate.candidate.title),
        date: fill(item.date, duplicate.candidate.date),
        url: fill(item.url, duplicate.candidate.url),
      } : item);
    } else {
      if (decision === "create_separate") next.certifications.push(duplicate.candidate);
      else next.certifications = next.certifications.map((item) => item.id === duplicate.existingId ? {
        ...item,
        name: fill(item.name, duplicate.candidate.name),
        issuer: fill(item.issuer, duplicate.candidate.issuer),
        issuedOn: fill(item.issuedOn, duplicate.candidate.issuedOn),
        expiresOn: fill(item.expiresOn, duplicate.candidate.expiresOn),
        credentialId: fill(item.credentialId, duplicate.candidate.credentialId),
        credentialUrl: fill(item.credentialUrl, duplicate.candidate.credentialUrl),
      } : item);
    }
  }
  return next;
}
