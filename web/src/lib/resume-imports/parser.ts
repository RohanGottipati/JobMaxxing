import { newId, type CareerProfileV1 } from "@/lib/career/schemas";
import { resumeImportResultSchema, type ResumeImportResult } from "@/lib/resume-imports/schemas";

type Page = { page: number; text: string };
type SectionName = "summary" | "experience" | "education" | "projects" | "skills" | "certifications" | "other";

const headings: Record<SectionName, RegExp> = {
  summary: /^(professional\s+)?summary|profile|objective$/i,
  experience: /^(work\s+)?experience|employment(\s+history)?|professional\s+experience$/i,
  education: /^education|academic\s+background$/i,
  projects: /^(selected\s+)?projects|personal\s+projects$/i,
  skills: /^(technical\s+)?skills|technologies|core\s+competencies$/i,
  certifications: /^certifications?|licenses?$/i,
  other: /$a/,
};

function cleanLines(text: string) {
  return text.replace(/\u0000/g, "").split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function sectionFor(line: string): SectionName | null {
  const normalized = line.replace(/[:\s]+$/, "").trim();
  for (const [name, expression] of Object.entries(headings) as Array<[SectionName, RegExp]>) {
    if (expression.test(normalized)) return name;
  }
  return null;
}

function sectionMap(text: string) {
  const result: Record<SectionName, string[]> = { summary: [], experience: [], education: [], projects: [], skills: [], certifications: [], other: [] };
  let active: SectionName = "other";
  for (const line of cleanLines(text)) {
    const heading = sectionFor(line);
    if (heading) active = heading;
    else result[active].push(line);
  }
  return result;
}

function sourcePage(pages: Page[], source: string) {
  const needle = source.slice(0, 60).toLocaleLowerCase();
  return pages.find((page) => page.text.toLocaleLowerCase().includes(needle))?.page ?? null;
}

function blankProfile(existing: CareerProfileV1): CareerProfileV1 {
  return structuredClone(existing);
}

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function bullets(lines: string[], page: (text: string) => number | null, evidence: ResumeImportResult["evidence"], parentPath: string) {
  return lines.filter((line) => /^[-•*]\s+/.test(line)).slice(0, 30).map((line, index) => {
    const text = line.replace(/^[-•*]\s+/, "").trim();
    const id = newId();
    evidence[`${parentPath}.bullets.${index}.approvedText`] = { confidence: 0.94, sourceText: line, page: page(line) };
    return { id, originalText: text, approvedText: text, technologies: [], demonstratedSkills: [], metrics: [], sourceKind: "resume_import" as const, verificationStatus: "unverified" as const, confidence: 0.94, isLocked: false };
  });
}

export function parseResumeDeterministically(input: {
  text: string;
  pages: Page[];
  existing: CareerProfileV1;
}): ResumeImportResult {
  const lines = cleanLines(input.text);
  const sections = sectionMap(input.text);
  const profile = blankProfile(input.existing);
  const evidence: ResumeImportResult["evidence"] = {};
  const warnings: string[] = [];
  const uncertainPaths: string[] = [];
  const duplicates: ResumeImportResult["duplicates"] = [];
  const page = (source: string) => sourcePage(input.pages, source);

  const emailMatch = input.text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = input.text.match(/(?:\+?\d[\d().\s-]{7,}\d)/);
  const urlMatches = [...input.text.matchAll(/https?:\/\/[^\s|)]+/gi)].map((match) => match[0].replace(/[.,;]+$/, ""));
  const firstLine = lines.find((line) => !emailMatch?.[0] || !line.includes(emailMatch[0])) ?? "";

  if (!profile.fullName && firstLine && firstLine.length <= 100 && !sectionFor(firstLine)) {
    profile.fullName = firstLine;
    evidence.fullName = { confidence: 0.78, sourceText: firstLine, page: page(firstLine) };
    uncertainPaths.push("fullName");
  }
  if (!profile.phone && phoneMatch) {
    profile.phone = phoneMatch[0].trim();
    evidence.phone = { confidence: 0.93, sourceText: phoneMatch[0], page: page(phoneMatch[0]) };
  }
  if (emailMatch) evidence.email = { confidence: 0.99, sourceText: emailMatch[0], page: page(emailMatch[0]) };

  for (const url of urlMatches.slice(0, 10)) {
    if (profile.links.some((link) => link.url === url)) continue;
    const lower = url.toLocaleLowerCase();
    const kind = lower.includes("linkedin.com") ? "linkedin" : lower.includes("github.com") ? "github" : "website";
    const id = newId();
    profile.links.push({ id, kind, label: kind === "website" ? "Website" : kind[0].toUpperCase() + kind.slice(1), url });
    evidence[`links.${id}.url`] = { confidence: 0.98, sourceText: url, page: page(url) };
  }

  if (!profile.summary && sections.summary.length) {
    profile.summary = sections.summary.join(" ").slice(0, 4_000);
    evidence.summary = { confidence: 0.9, sourceText: sections.summary.join("\n"), page: page(sections.summary[0]) };
  }

  const dateExpression = /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{1,2})[\s./-]+\d{2,4}|\b(?:19|20)\d{2}\b/gi;
  const experienceGroups: string[][] = [];
  let current: string[] = [];
  for (const line of sections.experience) {
    const isBullet = /^[-•*]\s+/.test(line);
    if (!isBullet && current.some((existing) => /^[-•*]\s+/.test(existing))) {
      experienceGroups.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length) experienceGroups.push(current);

  for (const group of experienceGroups.slice(0, 20)) {
    const headingLines = group.filter((line) => !/^[-•*]\s+/.test(line));
    if (!headingLines.length) continue;
    const dateLine = headingLines.find((line) => /\b(?:19|20)\d{2}\b/.test(line)) ?? "";
    const title = headingLines[0]?.replace(dateLine, "").trim() || "Imported role";
    const company = headingLines[1]?.replace(dateLine, "").trim() || "";
    const id = newId();
    const dates = [...dateLine.matchAll(dateExpression)].map((match) => match[0]);
    const item = { id, kind: "work" as const, jobTitle: title, company, location: "", startDate: dates[0] ?? "", endDate: dates[1] ?? "", isCurrent: /present|current/i.test(dateLine), originalText: "", approvedText: "", technologies: [], demonstratedSkills: [], metrics: [], sourceKind: "resume_import" as const, verificationStatus: "unverified" as const, confidence: company ? 0.8 : 0.62, isLocked: false, bullets: bullets(group, page, evidence, `experiences.${id}`) };
    const duplicate = profile.experiences.find((item) => normalize(item.jobTitle) === normalize(title) && normalize(item.company) === normalize(company));
    if (duplicate) {
      duplicates.push({ kind: "experience", importedId: id, existingId: duplicate.id, label: `${title}${company ? ` at ${company}` : ""}`, candidate: item });
      continue;
    }
    profile.experiences.push(item);
    evidence[`experiences.${id}`] = { confidence: item.confidence, sourceText: group.join("\n"), page: page(group[0]) };
    if (item.confidence < 0.8) uncertainPaths.push(`experiences.${id}`);
  }

  const educationLines = sections.education.filter((line) => !/^[-•*]\s+/.test(line));
  for (let index = 0; index < educationLines.length; index += 2) {
    const school = educationLines[index];
    if (!school) continue;
    const details = educationLines[index + 1] ?? "";
    const id = newId();
    const item = { id, school, degree: details, field: "", location: "", startDate: "", endDate: "", isCurrent: false, details: "" };
    const duplicate = profile.education.find((item) => normalize(item.school) === normalize(school));
    if (duplicate) {
      duplicates.push({ kind: "education", importedId: id, existingId: duplicate.id, label: school, candidate: item });
      continue;
    }
    profile.education.push(item);
    evidence[`education.${id}`] = { confidence: 0.68, sourceText: [school, details].join("\n"), page: page(school) };
    uncertainPaths.push(`education.${id}`);
  }

  const projectGroups = sections.projects.join("\n").split(/\n(?=[^-•*])/).map((value) => cleanLines(value)).filter((value) => value.length);
  for (const group of projectGroups.slice(0, 20)) {
    const title = group[0];
    if (!title) continue;
    const id = newId();
    const item = { id, title, date: "", url: "", originalText: "", approvedText: "", technologies: [], demonstratedSkills: [], metrics: [], sourceKind: "resume_import" as const, verificationStatus: "unverified" as const, confidence: 0.72, isLocked: false, bullets: bullets(group, page, evidence, `projects.${id}`) };
    const duplicate = profile.projects.find((item) => normalize(item.title) === normalize(title));
    if (duplicate) {
      duplicates.push({ kind: "project", importedId: id, existingId: duplicate.id, label: title, candidate: item });
      continue;
    }
    profile.projects.push(item);
    evidence[`projects.${id}`] = { confidence: 0.72, sourceText: group.join("\n"), page: page(title) };
    uncertainPaths.push(`projects.${id}`);
  }

  const skillNames = sections.skills.join(",").split(/[,|•]/).map((skill) => skill.replace(/^[^:]+:\s*/, "").trim()).filter((skill) => skill && skill.length <= 100);
  for (const name of skillNames.slice(0, 100)) {
    if (!profile.skills.some((skill) => normalize(skill.name) === normalize(name))) profile.skills.push({ id: newId(), name });
  }

  for (const line of sections.certifications.slice(0, 30)) {
    const id = newId();
    const item = { id, name: line, issuer: "", issuedOn: "", expiresOn: "", credentialId: "", credentialUrl: "", sourceKind: "resume_import" as const, verificationStatus: "unverified" as const, confidence: 0.76, isLocked: false };
    const duplicate = profile.certifications.find((current) => normalize(current.name) === normalize(line));
    if (duplicate) {
      duplicates.push({ kind: "certification", importedId: id, existingId: duplicate.id, label: line, candidate: item });
      continue;
    }
    profile.certifications.push(item);
    evidence[`certifications.${id}`] = { confidence: 0.76, sourceText: line, page: page(line) };
    uncertainPaths.push(`certifications.${id}`);
  }

  if (!sections.experience.length) warnings.push("No recognizable experience section was found.");
  if (!sections.education.length) warnings.push("No recognizable education section was found.");
  if (duplicates.length) warnings.push(`${duplicates.length} possible duplicate item${duplicates.length === 1 ? " needs" : "s need"} a merge decision before import.`);

  return resumeImportResultSchema.parse({ schemaVersion: 1, profile, evidence, uncertainPaths, duplicates, warnings });
}
