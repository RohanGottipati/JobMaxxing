import "server-only";

import { z } from "zod";

import { generateValidatedJson } from "@/lib/ai/gemini";
import { newId } from "@/lib/career/schemas";
import { isGroundedAiField } from "@/lib/resume-imports/grounding";
import type { ResumeImportResult } from "@/lib/resume-imports/schemas";

const sourcedText = z.object({ value: z.string().max(5_000), sourceText: z.string().min(1).max(5_000) });
const aiResumeSchema = z.object({
  fullName: sourcedText.nullable(),
  summary: sourcedText.nullable(),
  skills: z.array(sourcedText).max(100),
  experiences: z.array(z.object({
    jobTitle: sourcedText,
    company: sourcedText,
    location: sourcedText.nullable(),
    startDate: sourcedText.nullable(),
    endDate: sourcedText.nullable(),
    bullets: z.array(sourcedText).max(30),
  })).max(30),
});

export async function enhanceImportWithGemini(input: {
  sourceText: string;
  deterministic: ResumeImportResult;
}) {
  const ai = await generateValidatedJson({
    schema: aiResumeSchema,
    system: "Classify only facts explicitly present in the resume. Every value must include an exact sourceText substring copied from the resume. Never infer or invent employers, titles, skills, dates, metrics, education, or achievements.",
    prompt: `Extract structured resume fields from the text below. Return only the requested JSON.\n\n${input.sourceText}`,
  });
  const result = structuredClone(input.deterministic);
  let discarded = 0;
  const accept = (field: typeof sourcedText._output | null) => {
    if (!field || !isGroundedAiField(input.sourceText, field)) {
      if (field) discarded += 1;
      return null;
    }
    return field;
  };

  const fullName = accept(ai.fullName);
  if (!result.profile.fullName && fullName) {
    result.profile.fullName = fullName.value;
    result.evidence.fullName = { confidence: 0.88, sourceText: fullName.sourceText, page: null };
  }
  const summary = accept(ai.summary);
  if (!result.profile.summary && summary) {
    result.profile.summary = summary.value;
    result.evidence.summary = { confidence: 0.86, sourceText: summary.sourceText, page: null };
  }
  for (const skill of ai.skills) {
    const item = accept(skill);
    if (!item) continue;
    if (!result.profile.skills.some((existing) => existing.name.toLocaleLowerCase() === item.value.toLocaleLowerCase())) {
      result.profile.skills.push({ id: newId(), name: item.value });
    }
  }
  for (const experience of ai.experiences) {
    const title = accept(experience.jobTitle);
    const company = accept(experience.company);
    if (!title || !company) continue;
    if (result.profile.experiences.some((item) => item.jobTitle.toLocaleLowerCase() === title.value.toLocaleLowerCase() && item.company.toLocaleLowerCase() === company.value.toLocaleLowerCase())) continue;
    const id = newId();
    const location = accept(experience.location);
    const startDate = accept(experience.startDate);
    const endDate = accept(experience.endDate);
    const bullets = experience.bullets.flatMap((bullet) => {
      const accepted = accept(bullet);
      return accepted ? [{ id: newId(), originalText: accepted.value, approvedText: accepted.value, technologies: [], demonstratedSkills: [], metrics: [], sourceKind: "resume_import" as const, verificationStatus: "unverified" as const, confidence: 0.86, isLocked: false }] : [];
    });
    result.profile.experiences.push({ id, kind: "work", jobTitle: title.value, company: company.value, location: location?.value ?? "", startDate: startDate?.value ?? "", endDate: endDate?.value ?? "", isCurrent: /present|current/i.test(endDate?.value ?? ""), originalText: "", approvedText: "", technologies: [], demonstratedSkills: [], metrics: [], sourceKind: "resume_import", verificationStatus: "unverified", confidence: 0.84, isLocked: false, bullets });
    result.evidence[`experiences.${id}`] = { confidence: 0.84, sourceText: `${title.sourceText}\n${company.sourceText}`, page: null };
  }
  if (discarded) result.warnings.push(`${discarded} AI field${discarded === 1 ? " was" : "s were"} discarded because the source text did not support them.`);
  return result;
}
