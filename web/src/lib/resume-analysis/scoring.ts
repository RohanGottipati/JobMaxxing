import type { CareerProfileV1 } from "@/lib/career/schemas";
import type { ResumeRenderModel } from "@/lib/resumes/render-model";
import {
  RESUME_SCORE_CATEGORIES,
  type ResumeAnalysisResult,
  type ResumeScoreCategory,
} from "@/lib/resume-analysis/schemas";

const ACTION_VERBS = new Set([
  "accelerated", "achieved", "automated", "built", "created", "delivered", "designed", "developed", "drove", "implemented", "improved", "increased", "launched", "led", "managed", "migrated", "optimized", "owned", "reduced", "shipped", "streamlined",
]);
const LEADERSHIP_TERMS = /\b(led|managed|mentored|owned|drove|influenced|coordinated|directed|guided|strategy|roadmap)\b/i;
const TECHNICAL_TERMS = /\b(api|architecture|aws|azure|cloud|database|docker|gcp|kubernetes|latency|microservice|pipeline|react|reliability|sql|system|typescript|python|java|testing|deployment)\b/i;
const METRIC_PATTERN = /(?:[$€£]\s?\d|\d[\d,.]*\s?(?:%|percent|x\b|\+|ms\b|seconds?\b|minutes?\b|hours?\b|days?\b|users?\b|customers?\b|requests?\b|revenue\b|costs?\b))/i;

type Deduction = ResumeAnalysisResult["deductions"][number];

function words(value: string) {
  return value.trim().split(/\s+/).filter(Boolean);
}

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9+#]+/g, " ").replace(/\s+/g, " ").trim();
}

function dateValue(value: string) {
  const match = /^(\d{4})(?:-(\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  const month = Number(match[2] ?? "1");
  return month >= 1 && month <= 12 ? Number(match[1]) * 12 + month : null;
}

export function scoreResume(model: ResumeRenderModel, profile: CareerProfileV1 & { email?: string | null }): ResumeAnalysisResult {
  const scores = Object.fromEntries(RESUME_SCORE_CATEGORIES.map((category) => [category, 100])) as Record<ResumeScoreCategory, number>;
  const deductions: Deduction[] = [];
  const strengths: string[] = [];
  const bullets = model.sections.flatMap((section) => section.entries.flatMap((entry) => entry.bullets.map((text, index) => ({ text, location: `${section.title} · ${entry.primary} · bullet ${index + 1}` }))));
  const visibleText = [model.name, model.headline, ...model.contactText, ...model.sections.flatMap((section) => [section.title, section.inlineText, ...section.entries.flatMap((entry) => [entry.primary, entry.secondary, entry.body, ...entry.bullets])])].join("\n");

  function deduct(category: ResumeScoreCategory, points: number, problem: string, location: string, why: string, recommendedFix: string, href: string | null = null) {
    scores[category] = Math.max(0, scores[category] - points);
    deductions.push({
      id: `${category}-${deductions.length + 1}`,
      category,
      problem,
      location,
      why,
      points,
      recommendedFix,
      action: { type: href ? "navigate" : "edit", label: href ? "Open editor" : "Apply manually", href },
    });
  }

  if (!profile.fullName) deduct("contactCompleteness", 20, "Name is missing", "Contact header", "Recruiters and ATS systems need a clear candidate identity.", "Add your full name in the career profile.", "/profile");
  if (!profile.email) deduct("contactCompleteness", 20, "Email is missing", "Contact header", "A resume without an email cannot support recruiter follow-up.", "Add a professional email to your account.", "/profile");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) deduct("contactCompleteness", 15, "Email format looks invalid", "Contact header", "An invalid address can block recruiter contact and ATS parsing.", "Correct the email address in account settings.", "/profile");
  if (!profile.phone) deduct("contactCompleteness", 8, "Phone number is missing", "Contact header", "Many recruiters use phone outreach for screens.", "Add a phone number in your profile.", "/profile");
  if (!profile.location) deduct("contactCompleteness", 5, "Location is missing", "Contact header", "Location helps recruiters assess eligibility and work arrangement.", "Add a city, region, or remote preference.", "/profile");
  const invalidLink = model.links.find((link) => { try { return !["http:", "https:"].includes(new URL(link.url).protocol); } catch { return true; } });
  if (invalidLink) deduct("contactCompleteness", 6, "A profile link is invalid", `Contact link: ${invalidLink.label}`, "Broken links reduce credibility and cannot be followed by recruiters.", "Correct or remove the invalid URL.", "/profile");

  if (!model.sections.some((section) => section.type === "experience" && section.entries.length)) deduct("sectionCompleteness", 18, "Experience section is empty", "Experience", "Most reviewers need evidence of applied work, internships, volunteering, or equivalent delivery.", "Add relevant experience or make an existing entry visible.", "/profile");
  if (!model.sections.some((section) => section.type === "education" && section.entries.length)) deduct("sectionCompleteness", 8, "Education section is empty", "Education", "Education is commonly parsed by ATS systems and may be a stated requirement.", "Add relevant education or training.", "/profile");
  if (!model.sections.some((section) => section.type === "skills" && (section.inlineText || section.entries.length))) deduct("sectionCompleteness", 10, "Skills section is empty", "Skills", "A concise skills section improves keyword discovery and scanning.", "Add only supported skills from your profile.", "/profile");
  if (!profile.summary) deduct("contentQuality", 5, "Professional summary is missing", "Professional Summary", "A focused summary helps establish target and scope when the resume spans several domains.", "Add a concise, evidence-based summary.", "/profile");

  const totalWords = words(visibleText).length;
  if (totalWords < 180) deduct("applicationReadiness", 15, "Resume content is very sparse", "Entire resume", "Sparse resumes usually lack enough evidence for screening decisions.", "Add relevant verified accomplishments, projects, or education.", "/profile");
  if (totalWords > 1_200) deduct("brevity", 18, "Resume is unusually long", "Entire resume", "Dense content makes prioritization difficult and can exceed the intended page count.", "Remove repetitive or low-relevance content and use tighter bullets.");
  else if (totalWords > 850) deduct("brevity", 8, "Resume is dense", "Entire resume", "High density slows recruiter scanning and may cause page overflow.", "Shorten the least relevant bullets and remove repetition.");

  const longBullets = bullets.filter((bullet) => words(bullet.text).length > 35);
  for (const bullet of longBullets.slice(0, 5)) deduct("brevity", 3, "Bullet is longer than 35 words", bullet.location, "Long bullets hide the main action and result.", "Keep one clear action, context, and supported result.");
  const shortBullets = bullets.filter((bullet) => words(bullet.text).length < 5);
  if (shortBullets.length) deduct("contentQuality", Math.min(10, shortBullets.length * 2), `${shortBullets.length} bullet${shortBullets.length === 1 ? " is" : "s are"} too brief`, shortBullets[0]?.location ?? "Resume bullets", "Very short bullets often omit context, ownership, or outcomes.", "Add supported context and a concrete result where available.");

  const normalizedBullets = bullets.map((bullet) => normalize(bullet.text)).filter(Boolean);
  const duplicates = normalizedBullets.filter((bullet, index) => normalizedBullets.indexOf(bullet) !== index);
  if (duplicates.length) deduct("consistency", Math.min(15, duplicates.length * 5), "Duplicate bullet content detected", "Resume bullets", "Repeated content wastes space and weakens differentiation.", "Keep the strongest version and remove or rewrite duplicates.");

  const actionStarts = bullets.map((bullet) => normalize(bullet.text).split(" ")[0] ?? "");
  const weakStarts = actionStarts.filter((verb) => !ACTION_VERBS.has(verb));
  if (bullets.length && weakStarts.length / bullets.length > 0.4) deduct("actionVerbs", 12, "Many bullets do not begin with a strong action", "Resume bullets", "Clear action verbs make ownership and contribution easier to scan.", "Lead bullets with precise verbs that reflect the verified work.");
  const repeatedVerb = actionStarts.find((verb) => verb && actionStarts.filter((value) => value === verb).length >= 3);
  if (repeatedVerb) deduct("actionVerbs", 6, `Action verb “${repeatedVerb}” is repeated`, "Resume bullets", "Repeated openings make otherwise distinct accomplishments feel interchangeable.", "Use accurate alternative verbs without changing the underlying facts.");

  const quantified = bullets.filter((bullet) => METRIC_PATTERN.test(bullet.text)).length;
  const quantifiedRatio = bullets.length ? quantified / bullets.length : 0;
  if (bullets.length >= 3 && quantifiedRatio < 0.2) deduct("quantification", 15, "Few bullets contain verified scale or outcomes", "Resume bullets", "Supported measures make impact and scope more concrete.", "Add only metrics already verified in your profile; never estimate or invent them.", "/profile");
  else if (quantifiedRatio >= 0.4) strengths.push("A strong share of bullets includes concrete, supported measures.");

  const technicalRatio = bullets.length ? bullets.filter((bullet) => TECHNICAL_TERMS.test(bullet.text)).length / bullets.length : 0;
  if (profile.preferences.targetRoles.some((role) => /engineer|developer|data|cloud|devops|security|technical/i.test(role)) && technicalRatio < 0.25) deduct("technicalDepth", 12, "Technical evidence is limited for the target roles", "Experience and projects", "Technical reviewers look for tools, systems, constraints, and engineering decisions grounded in real work.", "Surface verified technologies and technical decisions in relevant bullets.");
  else if (technicalRatio >= 0.4) strengths.push("Technical scope is visible in multiple experience or project bullets.");

  const leadershipRatio = bullets.length ? bullets.filter((bullet) => LEADERSHIP_TERMS.test(bullet.text)).length / bullets.length : 0;
  if (["senior", "manager", "executive"].includes(profile.careerStage ?? "") && leadershipRatio < 0.15) deduct("leadershipEvidence", 12, "Leadership evidence is limited for the selected career stage", "Experience", "Senior hiring loops expect evidence of ownership, influence, mentorship, or direction.", "Emphasize verified leadership actions and outcomes.");
  else if (leadershipRatio >= 0.2) strengths.push("The resume includes visible ownership or leadership evidence.");

  const punctuation = bullets.map((bullet) => /[.!?]$/.test(bullet.text.trim()));
  if (punctuation.some(Boolean) && punctuation.some((value) => !value)) deduct("writingQuality", 5, "Bullet punctuation is inconsistent", "Resume bullets", "Consistent punctuation makes the document look deliberate and polished.", "Use one punctuation convention across all bullets.");
  const lowercaseStarts = bullets.filter((bullet) => /^[a-z]/.test(bullet.text.trim()));
  if (lowercaseStarts.length) deduct("writingQuality", Math.min(8, lowercaseStarts.length * 2), "Some bullets begin with lowercase text", lowercaseStarts[0]?.location ?? "Resume bullets", "Sentence-case consistency improves readability and professionalism.", "Capitalize the opening word of each bullet.");

  const invalidDates = profile.experiences.filter((item) => (item.startDate && dateValue(item.startDate) === null) || (!item.isCurrent && item.endDate && dateValue(item.endDate) === null));
  if (invalidDates.length) deduct("dateConsistency", Math.min(15, invalidDates.length * 5), "Experience dates use an inconsistent format", `${invalidDates[0].jobTitle} · ${invalidDates[0].company}`, "Inconsistent dates can confuse ATS parsing and chronology review.", "Use YYYY or YYYY-MM consistently.", "/profile");
  const reversedDates = profile.experiences.filter((item) => { const start = dateValue(item.startDate); const end = item.isCurrent ? null : dateValue(item.endDate); return start !== null && end !== null && end < start; });
  if (reversedDates.length) deduct("dateConsistency", 15, "An experience ends before it starts", `${reversedDates[0].jobTitle} · ${reversedDates[0].company}`, "Impossible date ranges create a credibility concern.", "Correct the start or end date.", "/profile");

  const evidencedSkills = normalize(profile.experiences.flatMap((item) => [item.approvedText, ...item.technologies, ...item.demonstratedSkills, ...item.bullets.map((bullet) => bullet.approvedText)]).concat(profile.projects.flatMap((item) => [item.approvedText, ...item.technologies, ...item.demonstratedSkills, ...item.bullets.map((bullet) => bullet.approvedText)])).join(" "));
  const unsupportedSkills = profile.skills.filter((skill) => !evidencedSkills.includes(normalize(skill.name)));
  if (profile.skills.length && unsupportedSkills.length / profile.skills.length > 0.5) deduct("contentQuality", 8, "Many listed skills lack visible evidence", `Skills: ${unsupportedSkills.slice(0, 4).map((item) => item.name).join(", ")}`, "Skills are more credible when they are demonstrated in work or projects.", "Add verified evidence or remove low-confidence skills.", "/profile");

  if (model.template.columns === 1) strengths.push("The selected template uses ATS-safe text and a predictable single-column reading order.");
  else deduct("atsReadability", 6, "The template uses two columns", "Entire resume", "Some older ATS parsers can read multi-column layouts in an unexpected order.", "Use a single-column template for conservative ATS compatibility.");
  if (model.links.length) strengths.push("Professional links are included and remain selectable in exports.");
  if (bullets.length >= 5) strengths.push("The resume includes scannable accomplishment-oriented bullet structure.");
  strengths.push("The resume is built from the canonical profile, preserving source facts and provenance.");

  scores.formatting = Math.min(scores.formatting, model.template.columns === 1 ? 100 : 92);
  scores.atsReadability = Math.min(scores.atsReadability, model.template.columns === 1 ? 100 : 88);
  scores.impact = Math.min(scores.impact, Math.round(55 + quantifiedRatio * 30 + leadershipRatio * 15));
  scores.jobRelevance = 100;
  scores.applicationReadiness = Math.min(scores.applicationReadiness, Math.round((scores.contactCompleteness + scores.sectionCompleteness + scores.contentQuality) / 3));

  const overallScore = Math.round(RESUME_SCORE_CATEGORIES.reduce((sum, category) => sum + scores[category], 0) / RESUME_SCORE_CATEGORIES.length);
  const reviews = buildDeterministicReviews(scores, deductions, strengths, profile);
  return { overallScore, categoryScores: scores, deductions, strengths: [...new Set(strengths)], reviews, analysisKind: "deterministic", model: null };
}

function buildDeterministicReviews(scores: Record<ResumeScoreCategory, number>, deductions: Deduction[], strengths: string[], profile: CareerProfileV1): ResumeAnalysisResult["reviews"] {
  const configs = [
    ["ats", "ATS reviewer", "Parseability, recognizable sections, contact details, and keyword evidence", ["atsReadability", "formatting", "sectionCompleteness"]],
    ["technical_recruiter", "Technical recruiter", "Technical keywords, role fit, scope, and concise impact", ["technicalDepth", "jobRelevance", "brevity"]],
    ["hiring_manager", "Hiring manager", "Outcomes, ownership, progression, and readiness", ["impact", "leadershipEvidence", "applicationReadiness"]],
    ["senior_engineer", "Senior engineer", "Technical depth, decisions, systems, and credibility", ["technicalDepth", "contentQuality", "consistency"]],
    ["startup_recruiter", "Startup recruiter", "Ownership, range, speed, and practical outcomes", ["leadershipEvidence", "impact", "brevity"]],
    ["nontechnical_recruiter", "Nontechnical recruiter", "Clarity, accessible language, chronology, and relevance", ["writingQuality", "dateConsistency", "contactCompleteness"]],
  ] as const;
  const perspectives = configs.map(([reviewer, label, focus, categories]) => {
    const score = Math.round(categories.reduce((sum, category) => sum + scores[category], 0) / categories.length);
    const related = deductions.filter((deduction) => (categories as readonly string[]).includes(deduction.category)).slice(0, 3);
    return {
      reviewer,
      label,
      focus,
      score,
      findings: related.length ? related.map((deduction) => ({ priority: deduction.points >= 12 ? "critical" as const : deduction.points >= 6 ? "high" as const : "optional" as const, title: deduction.problem, detail: deduction.why, location: deduction.location })) : [{ priority: "strength" as const, title: "No major issue detected in this review lens", detail: `The current ${focus.toLocaleLowerCase()} checks passed without a high-priority deduction.`, location: "Entire resume" }],
    };
  });
  return {
    perspectives,
    criticalFixes: deductions.filter((item) => item.points >= 12).map((item) => `${item.problem} — ${item.recommendedFix}`).slice(0, 8),
    highImpactImprovements: deductions.filter((item) => item.points >= 6 && item.points < 12).map((item) => `${item.problem} — ${item.recommendedFix}`).slice(0, 10),
    optionalImprovements: deductions.filter((item) => item.points < 6).map((item) => `${item.problem} — ${item.recommendedFix}`).slice(0, 10),
    strengths: strengths.slice(0, 10),
    credibilityConcerns: deductions.filter((item) => /impossible|invalid|duplicate|unsupported/i.test(`${item.problem} ${item.why}`)).map((item) => item.problem).slice(0, 8),
    missingEvidence: deductions.filter((item) => /evidence|metric|impact|technical|leadership/i.test(`${item.problem} ${item.why}`)).map((item) => item.problem).slice(0, 10),
    roleSpecificConcerns: profile.preferences.targetRoles.length ? deductions.filter((item) => ["technicalDepth", "leadershipEvidence", "jobRelevance"].includes(item.category)).map((item) => `${profile.preferences.targetRoles[0]}: ${item.problem}`).slice(0, 8) : [],
  };
}
