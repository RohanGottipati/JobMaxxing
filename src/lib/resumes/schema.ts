import { z } from "zod";

export const RESUME_SECTION_TYPES = [
  "header",
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
  "certifications",
  "awards",
  "publications",
  "volunteer",
  "languages",
] as const;

export const RESUME_TEMPLATE_IDS = [
  "technical-classic",
  "academic-standard",
  "engineering-standard",
  "campus-clean",
  "compact-sidebar",
  "minimal-modern",
  "compact-one-page",
  "professional-two-page",
] as const;

const entrySchema = z.object({
  id: z.uuid(),
  profileItemId: z.uuid().nullable(),
  visible: z.boolean(),
  bulletIds: z.array(z.uuid()).max(80),
  hiddenBulletIds: z.array(z.uuid()).max(80),
  lockedBulletIds: z.array(z.uuid()).max(80).optional(),
  textOverrides: z.record(z.string().max(80), z.string().max(5_000)),
});

const sectionSchema = z.object({
  id: z.uuid(),
  type: z.enum(RESUME_SECTION_TYPES),
  title: z.string().trim().min(1).max(80),
  visible: z.boolean(),
  pageBreakBefore: z.boolean(),
  entries: z.array(entrySchema).max(100),
});

export const resumeDocumentV1Schema = z.object({
  schemaVersion: z.literal(1),
  sections: z.array(sectionSchema).min(1).max(20),
  presentation: z.object({
    templateId: z.enum(RESUME_TEMPLATE_IDS),
    paperSize: z.enum(["letter", "a4"]),
    targetPages: z.union([z.literal(1), z.literal(2)]),
    fontScale: z.number().min(0.85).max(1.15),
    lineHeight: z.number().min(1).max(1.5),
    marginsPt: z.object({
      top: z.number().min(24).max(72),
      right: z.number().min(24).max(72),
      bottom: z.number().min(24).max(72),
      left: z.number().min(24).max(72),
    }),
    sectionGapPt: z.number().min(4).max(24),
    bulletGapPt: z.number().min(0).max(12),
    dateFormat: z.enum(["short", "long", "numeric"]),
    linkFormat: z.enum(["label", "url", "label_and_url"]),
  }),
});

export type ResumeDocumentV1 = z.infer<typeof resumeDocumentV1Schema>;
export type ResumeSectionType = (typeof RESUME_SECTION_TYPES)[number];
export type ResumeTemplateId = (typeof RESUME_TEMPLATE_IDS)[number];

export function createEmptyResumeDocument(
  templateId: ResumeTemplateId = "technical-classic",
): ResumeDocumentV1 {
  const section = (type: ResumeSectionType, title: string) => ({
    id: crypto.randomUUID(),
    type,
    title,
    visible: true,
    pageBreakBefore: false,
    entries: [],
  });

  return {
    schemaVersion: 1,
    sections: [
      section("header", "Contact"),
      section("summary", "Professional Summary"),
      section("experience", "Experience"),
      section("education", "Education"),
      section("projects", "Projects"),
      section("skills", "Skills"),
    ],
    presentation: {
      templateId,
      paperSize: "letter",
      targetPages: 1,
      fontScale: 1,
      lineHeight: 1.22,
      marginsPt: { top: 36, right: 38, bottom: 36, left: 38 },
      sectionGapPt: 10,
      bulletGapPt: 3,
      dateFormat: "short",
      linkFormat: "label",
    },
  };
}
