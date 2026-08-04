import type { CareerProfileV1 } from "@/lib/career/schemas";
import type { ResumeDocumentV1, ResumeSectionType } from "@/lib/resumes/schema";
import { getResumeTemplate } from "@/lib/resumes/templates";

export type ResumeRenderLink = {
  label: string;
  url: string;
};

export type ResumeRenderEntry = {
  id: string;
  primary: string;
  secondary: string;
  date: string;
  location: string;
  body: string;
  bullets: string[];
};

export type ResumeRenderSection = {
  id: string;
  type: ResumeSectionType;
  title: string;
  pageBreakBefore: boolean;
  inlineText: string;
  entries: ResumeRenderEntry[];
};

export type ResumeRenderModel = {
  name: string;
  headline: string;
  contactText: string[];
  links: ResumeRenderLink[];
  sections: ResumeRenderSection[];
  presentation: ResumeDocumentV1["presentation"];
  template: ReturnType<typeof getResumeTemplate>;
};

export function createResumeRenderModel(
  document: ResumeDocumentV1,
  profile: CareerProfileV1 & { email?: string | null },
): ResumeRenderModel {
  const sections = document.sections
    .filter((section) => section.visible && section.type !== "header")
    .map((section) => renderSection(section, document, profile))
    .filter((section) => section.inlineText || section.entries.length > 0);

  const links = profile.links
    .filter((link) => Boolean(link.url))
    .map((link) => ({
      label: linkLabel(link.label || link.kind, link.url, document.presentation.linkFormat),
      url: link.url,
    }));

  return {
    name: profile.fullName || "Your name",
    headline: profile.headline,
    contactText: [profile.email ?? "", profile.phone, profile.location].filter(Boolean),
    links,
    sections,
    presentation: document.presentation,
    template: getResumeTemplate(document.presentation.templateId),
  };
}

function renderSection(
  section: ResumeDocumentV1["sections"][number],
  document: ResumeDocumentV1,
  profile: CareerProfileV1,
): ResumeRenderSection {
  if (section.type === "summary") {
    const summary = section.entries[0]?.textOverrides.summary ?? profile.summary;
    return baseSection(section, summary, []);
  }

  if (["skills", "languages"].includes(section.type)) {
    const values = section.entries
      .filter((entry) => entry.visible)
      .flatMap((entry) => inlineValue(section.type, entry.profileItemId, profile));
    return baseSection(section, values.join(" • "), []);
  }

  const entries = section.entries
    .filter((entry) => entry.visible)
    .flatMap((entry) => renderEntry(section.type, entry, document, profile));
  return baseSection(section, "", entries);
}

function baseSection(
  section: ResumeDocumentV1["sections"][number],
  inlineText: string,
  entries: ResumeRenderEntry[],
): ResumeRenderSection {
  return {
    id: section.id,
    type: section.type,
    title: section.title,
    pageBreakBefore: section.pageBreakBefore,
    inlineText,
    entries,
  };
}

function renderEntry(
  type: ResumeSectionType,
  entry: ResumeDocumentV1["sections"][number]["entries"][number],
  document: ResumeDocumentV1,
  profile: CareerProfileV1,
): ResumeRenderEntry[] {
  const id = entry.profileItemId;
  if (!id) return [];
  const dateFormat = document.presentation.dateFormat;

  if (type === "experience" || type === "volunteer") {
    const item = profile.experiences.find((candidate) => candidate.id === id);
    if (!item) return [];
    const bullets = item.bullets.flatMap((bullet) =>
      entry.bulletIds.includes(bullet.id) && !entry.hiddenBulletIds.includes(bullet.id)
        ? [entry.textOverrides[bullet.id] ?? bullet.approvedText]
        : [],
    );
    return [{
      id: entry.id,
      primary: entry.textOverrides.jobTitle ?? item.jobTitle,
      secondary: entry.textOverrides.company ?? item.company,
      date: formatDateRange(item.startDate, item.isCurrent ? "Present" : item.endDate, dateFormat),
      location: item.location,
      body: bullets.length ? "" : item.approvedText,
      bullets,
    }];
  }

  if (type === "projects") {
    const item = profile.projects.find((candidate) => candidate.id === id);
    if (!item) return [];
    const bullets = item.bullets.flatMap((bullet) =>
      entry.bulletIds.includes(bullet.id) && !entry.hiddenBulletIds.includes(bullet.id)
        ? [entry.textOverrides[bullet.id] ?? bullet.approvedText]
        : [],
    );
    return [{
      id: entry.id,
      primary: entry.textOverrides.title ?? item.title,
      secondary: item.technologies.join(", "),
      date: formatDate(item.date, dateFormat),
      location: "",
      body: bullets.length ? "" : item.approvedText,
      bullets,
    }];
  }

  if (type === "education") {
    const item = profile.education.find((candidate) => candidate.id === id);
    if (!item) return [];
    return [{
      id: entry.id,
      primary: item.school,
      secondary: [item.degree, item.field].filter(Boolean).join(", "),
      date: formatDateRange(item.startDate, item.isCurrent ? "Present" : item.endDate, dateFormat),
      location: item.location,
      body: item.details,
      bullets: [],
    }];
  }

  if (type === "certifications") {
    const item = profile.certifications.find((candidate) => candidate.id === id);
    if (!item) return [];
    return [{
      id: entry.id,
      primary: item.name,
      secondary: item.issuer,
      date: formatDate(item.issuedOn, dateFormat),
      location: "",
      body: [item.credentialId ? `Credential ${item.credentialId}` : "", item.expiresOn ? `Expires ${formatDate(item.expiresOn, dateFormat)}` : ""].filter(Boolean).join(" · "),
      bullets: [],
    }];
  }

  if (type === "awards") {
    const item = profile.achievements.find((candidate) => candidate.id === id);
    if (!item) return [];
    return [{ id: entry.id, primary: item.title, secondary: "", date: formatDate(item.date, dateFormat), location: "", body: item.description, bullets: [] }];
  }

  if (type === "publications") {
    const item = profile.publications.find((candidate) => candidate.id === id);
    if (!item) return [];
    return [{ id: entry.id, primary: item.title, secondary: item.publisher, date: formatDate(item.publishedOn, dateFormat), location: "", body: item.description, bullets: [] }];
  }

  return [];
}

function inlineValue(type: ResumeSectionType, id: string | null, profile: CareerProfileV1): string[] {
  if (!id) return [];
  if (type === "skills") {
    const item = profile.skills.find((candidate) => candidate.id === id);
    return item ? [item.name] : [];
  }
  if (type === "languages") {
    const item = profile.languages.find((candidate) => candidate.id === id);
    return item ? [`${item.name}${item.proficiency ? ` (${titleCase(item.proficiency)})` : ""}`] : [];
  }
  return [];
}

export function formatDate(value: string, style: ResumeDocumentV1["presentation"]["dateFormat"]): string {
  const match = /^(\d{4})(?:-(\d{2}))?$/.exec(value.trim());
  if (!match) return value;
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : null;
  if (month !== null && (month < 1 || month > 12)) return value;
  if (!month || style === "numeric") return month ? `${year}-${String(month).padStart(2, "0")}` : String(year);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("en-US", {
    month: style === "long" ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatDateRange(start: string, end: string, style: ResumeDocumentV1["presentation"]["dateFormat"]): string {
  return [formatDate(start, style), end === "Present" ? end : formatDate(end, style)].filter(Boolean).join(" – ");
}

function linkLabel(label: string, url: string, format: ResumeDocumentV1["presentation"]["linkFormat"]): string {
  if (format === "url") return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (format === "label_and_url") return `${label}: ${url.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  return label;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
