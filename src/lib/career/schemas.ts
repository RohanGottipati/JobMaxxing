import { z } from "zod";

export const careerStageSchema = z.enum([
  "student",
  "new_grad",
  "early_career",
  "mid_career",
  "senior",
  "manager",
  "executive",
  "career_change",
]);

const idSchema = z.uuid();
const shortText = z.string().trim().max(240);
const longText = z.string().trim().max(10_000);
const dateText = z.string().trim().max(40);
const stringList = z.array(z.string().trim().min(1).max(100)).max(40);
const optionalWebUrl = z
  .string()
  .trim()
  .max(2_048)
  .refine((value) => {
    if (!value) return true;
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Enter a valid HTTP or HTTPS URL.");

export const profileLinkSchema = z.object({
  id: idSchema,
  kind: z.enum(["linkedin", "github", "portfolio", "website", "other"]),
  label: shortText,
  url: optionalWebUrl,
});

export const profileBulletSchema = z.object({
  id: idSchema,
  originalText: z.string().trim().min(1).max(2_000),
  approvedText: z.string().trim().min(1).max(2_000),
  technologies: stringList,
  demonstratedSkills: stringList,
  metrics: z.array(z.string().trim().min(1).max(160)).max(20),
  sourceKind: z.enum(["manual", "resume_import", "migration"]),
  verificationStatus: z.enum(["unverified", "user_confirmed", "source_verified"]),
  confidence: z.number().min(0).max(1).nullable(),
  isLocked: z.boolean(),
});

export const experienceSchema = z.object({
  id: idSchema,
  kind: z.enum(["work", "volunteer"]),
  jobTitle: shortText,
  company: shortText,
  location: shortText,
  startDate: dateText,
  endDate: dateText,
  isCurrent: z.boolean(),
  originalText: longText,
  approvedText: longText,
  technologies: stringList,
  demonstratedSkills: stringList,
  metrics: z.array(z.string().trim().min(1).max(160)).max(20),
  sourceKind: z.enum(["manual", "resume_import", "migration"]),
  verificationStatus: z.enum(["unverified", "user_confirmed", "source_verified"]),
  confidence: z.number().min(0).max(1).nullable(),
  isLocked: z.boolean(),
  bullets: z.array(profileBulletSchema).max(60),
});

export const educationSchema = z.object({
  id: idSchema,
  school: shortText,
  degree: shortText,
  field: shortText,
  location: shortText,
  startDate: dateText,
  endDate: dateText,
  isCurrent: z.boolean(),
  details: longText,
});

export const projectSchema = z.object({
  id: idSchema,
  title: shortText,
  date: dateText,
  url: optionalWebUrl,
  originalText: longText,
  approvedText: longText,
  technologies: stringList,
  demonstratedSkills: stringList,
  metrics: z.array(z.string().trim().min(1).max(160)).max(20),
  sourceKind: z.enum(["manual", "resume_import", "migration"]),
  verificationStatus: z.enum(["unverified", "user_confirmed", "source_verified"]),
  confidence: z.number().min(0).max(1).nullable(),
  isLocked: z.boolean(),
  bullets: z.array(profileBulletSchema).max(60),
});

export const achievementSchema = z.object({
  id: idSchema,
  kind: z.enum(["achievement", "award"]),
  title: shortText,
  description: longText,
  date: dateText,
});

export const certificationSchema = z.object({
  id: idSchema,
  name: shortText,
  issuer: shortText,
  issuedOn: dateText,
  expiresOn: dateText,
  credentialId: shortText,
  credentialUrl: optionalWebUrl,
  sourceKind: z.enum(["manual", "resume_import", "migration"]),
  verificationStatus: z.enum(["unverified", "user_confirmed", "source_verified"]),
  confidence: z.number().min(0).max(1).nullable(),
  isLocked: z.boolean(),
});

export const publicationSchema = z.object({
  id: idSchema,
  title: shortText,
  publisher: shortText,
  publishedOn: dateText,
  url: optionalWebUrl,
  description: longText,
  sourceKind: z.enum(["manual", "resume_import", "migration"]),
  verificationStatus: z.enum(["unverified", "user_confirmed", "source_verified"]),
  confidence: z.number().min(0).max(1).nullable(),
  isLocked: z.boolean(),
});

export const languageSchema = z.object({
  id: idSchema,
  name: shortText,
  proficiency: z.enum(["basic", "conversational", "professional", "native"]).nullable(),
});

export const careerPreferencesSchema = z.object({
  targetRoles: z.array(shortText.min(1)).max(20),
  preferredLocations: z.array(shortText.min(1)).max(20),
  workArrangements: z.array(z.enum(["remote", "hybrid", "onsite"])).max(3),
  salaryMin: z.number().int().min(0).max(10_000_000).nullable(),
  salaryCurrency: z.string().regex(/^[A-Z]{3}$/).nullable(),
  workAuthorizationStatus: shortText,
  requiresSponsorship: z.boolean().nullable(),
});

export const careerProfileV1Schema = z.object({
  schemaVersion: z.literal(1),
  revision: z.number().int().nonnegative(),
  fullName: shortText,
  headline: shortText,
  phone: z.string().trim().max(60),
  location: shortText,
  summary: longText,
  additionalInfo: longText,
  careerStage: careerStageSchema.nullable(),
  links: z.array(profileLinkSchema).max(20),
  experiences: z.array(experienceSchema).max(50),
  education: z.array(educationSchema).max(30),
  projects: z.array(projectSchema).max(50),
  skills: z.array(z.object({ id: idSchema, name: shortText.min(1) })).max(200),
  achievements: z.array(achievementSchema).max(50),
  certifications: z.array(certificationSchema).max(50),
  publications: z.array(publicationSchema).max(50),
  languages: z.array(languageSchema).max(30),
  preferences: careerPreferencesSchema,
});

export type CareerProfileV1 = z.infer<typeof careerProfileV1Schema>;
export type CareerPreferences = z.infer<typeof careerPreferencesSchema>;

export function newId() {
  return crypto.randomUUID();
}

