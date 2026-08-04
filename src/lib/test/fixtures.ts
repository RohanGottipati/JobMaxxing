import type { CareerProfileV1 } from "@/lib/career/schemas";
import { createEmptyResumeDocument, type ResumeDocumentV1 } from "@/lib/resumes/schema";

export const IDS = {
  experience: "11111111-1111-4111-8111-111111111111",
  bullet: "11111111-1111-4111-8111-111111111112",
  education: "11111111-1111-4111-8111-111111111113",
  skill: "11111111-1111-4111-8111-111111111114",
  link: "11111111-1111-4111-8111-111111111115",
};

export function careerProfileFixture(): CareerProfileV1 & { email: string } {
  return {
    schemaVersion: 1,
    revision: 0,
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    headline: "Platform Engineer",
    phone: "+1 416 555 0100",
    location: "Toronto, ON",
    summary: "Builds reliable systems.",
    additionalInfo: "",
    careerStage: "mid_career",
    links: [{ id: IDS.link, kind: "github", label: "GitHub", url: "https://github.com/ada" }],
    experiences: [{
      id: IDS.experience,
      kind: "work",
      jobTitle: "Platform Engineer",
      company: "Example Co",
      location: "Toronto, ON",
      startDate: "2022-01",
      endDate: "2024-06",
      isCurrent: false,
      originalText: "Built reliable APIs.",
      approvedText: "Built reliable APIs.",
      technologies: ["PostgreSQL"],
      demonstratedSkills: ["Reliability"],
      metrics: ["30%"],
      sourceKind: "manual",
      verificationStatus: "user_confirmed",
      confidence: 1,
      isLocked: false,
      bullets: [{
        id: IDS.bullet,
        originalText: "Reduced API latency by 30%.",
        approvedText: "Reduced API latency by 30%.",
        technologies: ["PostgreSQL"],
        demonstratedSkills: ["Performance"],
        metrics: ["30%"],
        sourceKind: "manual",
        verificationStatus: "user_confirmed",
        confidence: 1,
        isLocked: false,
      }],
    }],
    education: [{ id: IDS.education, school: "University of Toronto", degree: "BASc", field: "Computer Engineering", location: "Toronto, ON", startDate: "2018-09", endDate: "2022-05", isCurrent: false, details: "" }],
    projects: [],
    skills: [{ id: IDS.skill, name: "PostgreSQL" }],
    achievements: [],
    certifications: [],
    publications: [],
    languages: [],
    preferences: { targetRoles: ["Platform Engineer"], preferredLocations: ["Toronto"], workArrangements: ["hybrid"], salaryMin: null, salaryCurrency: null, workAuthorizationStatus: "", requiresSponsorship: null },
  };
}

export function resumeDocumentFixture(): ResumeDocumentV1 {
  const document = createEmptyResumeDocument("technical-classic");
  for (const section of document.sections) {
    if (section.type === "summary") section.entries = [{ id: crypto.randomUUID(), profileItemId: null, visible: true, bulletIds: [], hiddenBulletIds: [], textOverrides: {} }];
    if (section.type === "experience") section.entries = [{ id: crypto.randomUUID(), profileItemId: IDS.experience, visible: true, bulletIds: [IDS.bullet], hiddenBulletIds: [], textOverrides: {} }];
    if (section.type === "education") section.entries = [{ id: crypto.randomUUID(), profileItemId: IDS.education, visible: true, bulletIds: [], hiddenBulletIds: [], textOverrides: {} }];
    if (section.type === "skills") section.entries = [{ id: crypto.randomUUID(), profileItemId: IDS.skill, visible: true, bulletIds: [], hiddenBulletIds: [], textOverrides: {} }];
  }
  return document;
}
