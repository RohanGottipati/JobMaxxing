import type { CareerProfileV1 } from "@/lib/career/schemas";
import { jobMatchResultSchema, type EvidenceMatrixRow, type JobStructuredData } from "@/lib/job-intelligence/schemas";
import type { ResumeRenderModel } from "@/lib/resumes/render-model";

const RELATED: Record<string, string[]> = {
  javascript: ["typescript", "node.js", "react", "next.js"], typescript: ["javascript", "node.js", "react", "next.js"], aws: ["cloud", "azure", "gcp"], azure: ["cloud", "aws", "gcp"], gcp: ["cloud", "aws", "azure"], kubernetes: ["docker", "containers", "orchestration"], postgresql: ["sql", "database", "mysql"], mysql: ["sql", "database", "postgresql"], react: ["javascript", "typescript", "frontend", "next.js"], "machine learning": ["python", "tensorflow", "pytorch", "data science"],
};

function normalize(value: string) { return value.toLocaleLowerCase().replace(/[^a-z0-9+#.]+/g, " ").replace(/\s+/g, " ").trim(); }
function tokens(value: string) { return new Set(normalize(value).split(" ").filter((token) => token.length > 2)); }
function overlap(left: string, right: string) { const a = tokens(left); const b = tokens(right); if (!a.size || !b.size) return 0; return [...a].filter((token) => b.has(token)).length / Math.max(a.size, b.size); }
function clamp(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }

type EvidenceItem = { id: string; type: "experience" | "project" | "education" | "skill" | "preference" | "resume"; label: string; text: string; verified: boolean };

function evidenceItems(profile: CareerProfileV1, resume: ResumeRenderModel): EvidenceItem[] {
  const visible = normalize(JSON.stringify(resume));
  const items: EvidenceItem[] = [];
  for (const item of profile.experiences) {
    const verified = item.verificationStatus !== "unverified";
    const text = [item.jobTitle, item.company, item.approvedText, ...item.technologies, ...item.demonstratedSkills, ...item.bullets.map((bullet) => bullet.approvedText)].join(" ");
    if (visible.includes(normalize(item.jobTitle)) || item.bullets.some((bullet) => visible.includes(normalize(bullet.approvedText)))) items.push({ id: item.id, type: "experience", label: `${item.jobTitle} · ${item.company}`, text, verified });
    for (const bullet of item.bullets) if (visible.includes(normalize(bullet.approvedText))) items.push({ id: bullet.id, type: "experience", label: `${item.jobTitle} bullet`, text: [bullet.approvedText, ...bullet.technologies, ...bullet.demonstratedSkills, ...bullet.metrics].join(" "), verified: bullet.verificationStatus !== "unverified" });
  }
  for (const item of profile.projects) {
    const text = [item.title, item.approvedText, ...item.technologies, ...item.demonstratedSkills, ...item.bullets.map((bullet) => bullet.approvedText)].join(" ");
    if (visible.includes(normalize(item.title)) || item.bullets.some((bullet) => visible.includes(normalize(bullet.approvedText)))) items.push({ id: item.id, type: "project", label: item.title, text, verified: item.verificationStatus !== "unverified" });
  }
  for (const item of profile.education) items.push({ id: item.id, type: "education", label: item.school, text: [item.school, item.degree, item.field, item.details].join(" "), verified: true });
  for (const item of profile.skills) items.push({ id: item.id, type: "skill", label: item.name, text: item.name, verified: false });
  return items;
}

function skillRow(skill: string, type: "required_skill" | "preferred_skill", items: EvidenceItem[], index: number): EvidenceMatrixRow {
  const normalized = normalize(skill);
  const related = RELATED[normalized] ?? [];
  const exact = items.filter((item) => normalize(item.text).includes(normalized));
  const relatedItems = exact.length ? [] : items.filter((item) => related.some((term) => normalize(item.text).includes(normalize(term))));
  const verifiedExact = exact.filter((item) => item.verified);
  const strength: EvidenceMatrixRow["strength"] = verifiedExact.length ? "strong" : exact.length ? "unverified" : relatedItems.some((item) => item.verified) ? "partial" : relatedItems.length ? "related" : "none";
  const selected = (exact.length ? exact : relatedItems).slice(0, 5);
  return {
    id: `${type}-${index}-${normalized.replace(/\s+/g, "-")}`,
    requirement: skill,
    requirementType: type,
    candidateEvidence: selected.map((item) => item.text.slice(0, 800)),
    evidenceSource: selected.map(({ id, type: sourceType, label, verified }) => ({ id, type: sourceType, label, verified })),
    confidence: strength === "strong" ? 0.95 : strength === "unverified" ? 0.62 : strength === "partial" ? 0.68 : strength === "related" ? 0.45 : 0.92,
    strength,
    missingEvidence: strength === "strong" ? "" : strength === "none" ? `No resume evidence demonstrates ${skill}.` : `Evidence for ${skill} is ${strength === "unverified" ? "not verified" : "indirect"}.`,
    suggestedAction: strength === "strong" ? "Keep the strongest evidence visible and near the top of the relevant section." : strength === "none" ? "Do not add this skill. Build verified evidence before claiming it." : "Surface the related evidence accurately without claiming an exact skill you have not verified.",
  };
}

function requirementRow(input: Omit<EvidenceMatrixRow, "id" | "confidence"> & { confidence?: number }, index: number): EvidenceMatrixRow { return { id: `${input.requirementType}-${index}`, confidence: input.confidence ?? (input.strength === "strong" ? 0.9 : input.strength === "none" ? 0.85 : 0.6), ...input }; }

function stageLevel(stage: CareerProfileV1["careerStage"]) { return { student: 0, new_grad: 1, early_career: 2, mid_career: 3, senior: 4, manager: 5, executive: 6, career_change: 2 }[stage ?? "student"]; }
function seniorityLevel(value: JobStructuredData["seniority"]) { return { intern: 0, entry: 1, mid: 3, senior: 4, staff: 5, principal: 6, manager: 5, director: 6, executive: 7, unknown: 3 }[value]; }
function strengthScore(value: EvidenceMatrixRow["strength"]) { return { strong: 100, partial: 65, related: 40, unverified: 25, none: 0 }[value]; }

export function calculateJobMatch(job: JobStructuredData, profile: CareerProfileV1, resume: ResumeRenderModel, now = new Date()) {
  const items = evidenceItems(profile, resume);
  const rows: EvidenceMatrixRow[] = [
    ...job.requiredSkills.map((skill, index) => skillRow(skill, "required_skill", items, index)),
    ...job.preferredSkills.map((skill, index) => skillRow(skill, "preferred_skill", items, index)),
  ];
  const experienceYears = profile.experiences.reduce((sum, item) => { const start = /^(\d{4})/.exec(item.startDate)?.[1]; const end = item.isCurrent ? now.getUTCFullYear() : Number(/^(\d{4})/.exec(item.endDate)?.[1]); return start && end ? sum + Math.max(0, end - Number(start)) : sum; }, 0);
  if (job.yearsExperience.min !== null) rows.push(requirementRow({ requirement: `${job.yearsExperience.min}${job.yearsExperience.max && job.yearsExperience.max !== job.yearsExperience.min ? `–${job.yearsExperience.max}` : "+"} years of experience`, requirementType: "experience", candidateEvidence: [`Approximately ${experienceYears} years across dated profile experiences`], evidenceSource: profile.experiences.map((item) => ({ id: item.id, type: "experience" as const, label: `${item.jobTitle} · ${item.company}`, verified: item.verificationStatus !== "unverified" })), strength: experienceYears >= job.yearsExperience.min ? "strong" : experienceYears >= Math.max(0, job.yearsExperience.min - 1) ? "partial" : "none", missingEvidence: experienceYears >= job.yearsExperience.min ? "" : "Dated experience does not reach the stated minimum.", suggestedAction: "Keep dates accurate; do not round up experience duration." }, rows.length));
  for (const requirement of job.educationRequirements) { const matching = items.filter((item) => item.type === "education" && overlap(item.text, requirement) > 0.15); rows.push(requirementRow({ requirement, requirementType: "education", candidateEvidence: matching.map((item) => item.text), evidenceSource: matching.map(({ id, type, label, verified }) => ({ id, type, label, verified })), strength: matching.length ? "strong" : "none", missingEvidence: matching.length ? "" : "No matching education is stored in the profile.", suggestedAction: matching.length ? "Keep relevant education visible." : "Do not claim an education credential that is not in your profile." }, rows.length)); }
  const preferredLocations = profile.preferences.preferredLocations.map(normalize);
  if (job.location) { const match = !preferredLocations.length || preferredLocations.some((location) => normalize(job.location).includes(location) || location.includes(normalize(job.location))) || job.workArrangement === "remote"; rows.push(requirementRow({ requirement: job.location, requirementType: "location", candidateEvidence: profile.preferences.preferredLocations, evidenceSource: [{ id: "career-preferences", type: "preference", label: "Preferred locations", verified: true }], strength: match ? "strong" : "none", missingEvidence: match ? "" : "Job location does not match saved preferences.", suggestedAction: match ? "No change needed." : "Confirm relocation or commute feasibility before applying." }, rows.length)); }
  if (job.workArrangement !== "unknown") { const match = profile.preferences.workArrangements.includes(job.workArrangement); rows.push(requirementRow({ requirement: job.workArrangement, requirementType: "work_arrangement", candidateEvidence: profile.preferences.workArrangements, evidenceSource: [{ id: "career-preferences", type: "preference", label: "Work arrangement preferences", verified: true }], strength: match ? "strong" : profile.preferences.workArrangements.length ? "none" : "unverified", missingEvidence: match ? "" : "Work arrangement is not included in saved preferences.", suggestedAction: "Confirm the arrangement is acceptable before applying." }, rows.length)); }
  for (const requirement of job.workAuthorizationRequirements) { const preference = profile.preferences.workAuthorizationStatus; const conflict = /no sponsorship|without sponsorship|must be authori[sz]ed/i.test(requirement) && profile.preferences.requiresSponsorship === true; rows.push(requirementRow({ requirement, requirementType: "work_authorization", candidateEvidence: preference ? [preference] : [], evidenceSource: [{ id: "career-preferences", type: "preference", label: "Work authorization", verified: Boolean(preference) }], strength: conflict ? "none" : preference ? "strong" : "unverified", missingEvidence: conflict ? "Saved sponsorship needs conflict with this requirement." : preference ? "" : "Work authorization is not confirmed in the profile.", suggestedAction: conflict ? "Treat this as a hard conflict unless the employer confirms sponsorship." : "Confirm factual authorization details; never guess legal information." }, rows.length)); }
  if (job.compensation.min !== null || job.compensation.max !== null) { const target = profile.preferences.salaryMin; const compatible = target === null || job.compensation.max === null || target <= job.compensation.max; rows.push(requirementRow({ requirement: `${job.compensation.currency ?? ""} ${job.compensation.min ?? "?"}–${job.compensation.max ?? "?"} / ${job.compensation.period ?? "period"}`, requirementType: "compensation", candidateEvidence: target === null ? [] : [`Minimum target: ${profile.preferences.salaryCurrency ?? ""} ${target}`], evidenceSource: [{ id: "career-preferences", type: "preference", label: "Salary preferences", verified: target !== null }], strength: compatible ? (target === null ? "unverified" : "strong") : "none", missingEvidence: compatible ? "" : "Maximum posted compensation is below the saved minimum target.", suggestedAction: "Confirm currency, level, and total compensation before treating ranges as directly comparable." }, rows.length)); }

  const requiredRows = rows.filter((row) => row.requirementType === "required_skill");
  const preferredRows = rows.filter((row) => row.requirementType === "preferred_skill");
  const avg = (values: number[], fallback = 100) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : fallback;
  const roleSimilarity = clamp(Math.max(...[profile.headline, ...profile.preferences.targetRoles, ...profile.experiences.map((item) => item.jobTitle)].map((value) => overlap(value, job.roleTitle) * 100), 0));
  const levelDelta = stageLevel(profile.careerStage) - seniorityLevel(job.seniority);
  const categoryScores = {
    requiredSkillOverlap: avg(requiredRows.map((row) => strengthScore(row.strength))),
    preferredSkillOverlap: avg(preferredRows.map((row) => strengthScore(row.strength))),
    roleSimilarity,
    seniorityFit: job.seniority === "unknown" ? 100 : levelDelta >= 0 ? 100 : levelDelta === -1 ? 70 : levelDelta === -2 ? 35 : 10,
    experienceDomainFit: clamp(Math.max(40, overlap(items.map((item) => item.text).join(" "), job.responsibilities.join(" ")) * 180)),
    educationFit: avg(rows.filter((row) => row.requirementType === "education").map((row) => strengthScore(row.strength))),
    locationFit: avg(rows.filter((row) => row.requirementType === "location").map((row) => strengthScore(row.strength))),
    workArrangementFit: avg(rows.filter((row) => row.requirementType === "work_arrangement").map((row) => strengthScore(row.strength))),
    compensationFit: avg(rows.filter((row) => row.requirementType === "compensation").map((row) => strengthScore(row.strength))),
    workAuthorizationFit: avg(rows.filter((row) => row.requirementType === "work_authorization").map((row) => strengthScore(row.strength))),
  };
  const weights: Array<[keyof typeof categoryScores, number]> = [["requiredSkillOverlap", .30], ["preferredSkillOverlap", .10], ["roleSimilarity", .10], ["seniorityFit", .10], ["experienceDomainFit", .10], ["educationFit", .05], ["locationFit", .07], ["workArrangementFit", .06], ["compensationFit", .04], ["workAuthorizationFit", .08]];
  let overallScore = weights.reduce((sum, [key, weight]) => sum + categoryScores[key] * weight, 0);
  const missingMandatory = requiredRows.filter((row) => row.strength === "none");
  overallScore -= Math.min(18, missingMandatory.length * 3);
  const hardAuthorizationConflict = rows.some((row) => row.requirementType === "work_authorization" && row.strength === "none");
  const expired = job.applicationDeadline && !Number.isNaN(Date.parse(job.applicationDeadline)) && new Date(job.applicationDeadline) < now;
  if (hardAuthorizationConflict) overallScore -= 20;
  if (expired) overallScore -= 15;
  overallScore = clamp(overallScore);
  const strongMatches = rows.filter((row) => row.strength === "strong").map((row) => row.requirement);
  const partialMatches = rows.filter((row) => ["partial", "related", "unverified"].includes(row.strength)).map((row) => `${row.requirement} (${row.strength})`);
  const missingRequirements = rows.filter((row) => row.strength === "none").map((row) => row.requirement);
  const concerns = [hardAuthorizationConflict ? "Work-authorization or sponsorship conflict detected." : "", expired ? "The application deadline appears to have passed." : "", levelDelta < -1 ? "The role may be more senior than the saved career-stage evidence." : "", ...rows.filter((row) => row.strength === "unverified").map((row) => `${row.requirement} has only unverified evidence.`)].filter(Boolean);
  const recommendedChanges = rows.filter((row) => row.strength !== "strong").slice(0, 20).map((row, index) => ({ id: `recommendation-${index}`, priority: row.requirementType === "required_skill" && row.strength === "none" ? "critical" as const : row.requirementType === "required_skill" ? "high" as const : "medium" as const, recommendation: row.suggestedAction, evidence: row.candidateEvidence.slice(0, 3) }));
  const applyReasonable = overallScore >= 55 && !hardAuthorizationConflict && !expired;
  const rationale = applyReasonable ? `Applying is reasonable based on a ${overallScore}% evidence-weighted fit, while the missing and partial requirements should be reviewed.` : `Pause before applying: the current score is ${overallScore}%${hardAuthorizationConflict ? " with a work-authorization conflict" : expired ? " and the posting appears expired" : " with material evidence gaps"}.`;
  return jobMatchResultSchema.parse({ overallScore, categoryScores, strongMatches, partialMatches, missingRequirements, concerns, evidenceMatrix: rows, recommendedChanges, applyReasonable, rationale });
}
