import { parsedJobSchema, type JobStructuredData } from "@/lib/job-intelligence/schemas";

const SKILLS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Python", "Java", "C#", "C++", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "GraphQL", "REST", "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Linux", "Git", "CI/CD", "Kafka", "Spark", "Airflow", "Snowflake", "Databricks", "TensorFlow", "PyTorch", "Machine Learning", "Data Science", "System Design", "Microservices", "Observability", "Security", "Figma", "Product Management", "Agile", "Scrum",
];

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim().replace(/^[-•*]\s*/, "")).filter(Boolean))];
}

function includesSkill(line: string, skill: string) {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\ /g, "[\\s-]+");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(line);
}

function sectionLines(lines: string[], heading: RegExp) {
  const start = lines.findIndex((line) => heading.test(line));
  if (start < 0) return [];
  const result: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (result.length && /^[A-Z][A-Za-z /&-]{2,40}:?$/.test(line) && !/^[-•*]/.test(line)) break;
    if (line) result.push(line);
    if (result.length >= 30) break;
  }
  return result;
}

function inferSeniority(title: string): JobStructuredData["seniority"] {
  if (/\bintern(ship)?\b/i.test(title)) return "intern";
  if (/\b(junior|entry|new grad|graduate|associate)\b/i.test(title)) return "entry";
  if (/\bprincipal\b/i.test(title)) return "principal";
  if (/\bstaff\b/i.test(title)) return "staff";
  if (/\b(senior|sr\.)\b/i.test(title)) return "senior";
  if (/\b(manager|lead)\b/i.test(title)) return "manager";
  if (/\bdirector\b/i.test(title)) return "director";
  if (/\b(vp|vice president|chief|head of)\b/i.test(title)) return "executive";
  return title ? "mid" : "unknown";
}

function inferRoleCategory(title: string) {
  const categories: Array<[RegExp, string]> = [
    [/front.?end/i, "Frontend Engineering"], [/back.?end/i, "Backend Engineering"], [/full.?stack/i, "Full-stack Engineering"], [/devops|platform/i, "Platform / DevOps"], [/site reliability|\bsre\b/i, "Site Reliability"], [/data engineer/i, "Data Engineering"], [/machine learning|\bml\b/i, "Machine Learning"], [/data scientist/i, "Data Science"], [/security/i, "Security Engineering"], [/mobile|ios|android/i, "Mobile Engineering"], [/product manager/i, "Product Management"], [/software|developer|engineer/i, "Software Engineering"],
  ];
  return categories.find(([pattern]) => pattern.test(title))?.[1] ?? "";
}

export function parseJobDescription(input: { sourceText: string; company: string; roleTitle: string; location?: string | null }) {
  const source = input.sourceText.replace(/\0/g, "").slice(0, 100_000);
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const preferredLines = lines.filter((line) => /preferred|nice to have|bonus|plus\b/i.test(line));
  const requiredContext = sectionLines(lines, /^(requirements?|qualifications?|what you(?:'|’)ll need|must have)/i);
  const responsibilityLines = sectionLines(lines, /^(responsibilities|what you(?:'|’)ll do|the role|duties|your impact)/i).filter((line) => /^[-•*]|\b(design|build|develop|lead|manage|create|own|deliver|collaborate|implement|support|maintain|drive)\b/i.test(line)).slice(0, 25);
  const requiredSkills = SKILLS.filter((skill) => requiredContext.some((line) => includesSkill(line, skill)) || (lines.some((line) => /required|must have|proficien|experience with/i.test(line) && includesSkill(line, skill)) && !preferredLines.some((line) => includesSkill(line, skill))));
  const preferredSkills = SKILLS.filter((skill) => preferredLines.some((line) => includesSkill(line, skill)) && !requiredSkills.includes(skill));
  const allMentioned = SKILLS.filter((skill) => lines.some((line) => includesSkill(line, skill)));
  for (const skill of allMentioned) if (!requiredSkills.includes(skill) && !preferredSkills.includes(skill)) requiredSkills.push(skill);

  const yearsMatches = [...source.matchAll(/(\d{1,2})(?:\s*(?:-|–|to)\s*(\d{1,2}))?\+?\s+years?(?:\s+of)?\s+(?:professional\s+)?experience/gi)];
  const yearMins = yearsMatches.map((match) => Number(match[1])).filter(Number.isFinite);
  const yearMaxes = yearsMatches.map((match) => Number(match[2] ?? match[1])).filter(Number.isFinite);
  const educationRequirements = unique(lines.filter((line) => /\b(bachelor|master|ph\.?d|degree|diploma|computer science|engineering degree)\b/i.test(line))).slice(0, 15);
  const workAuthorizationRequirements = unique(lines.filter((line) => /\b(work authori[sz]ation|authori[sz]ed to work|sponsorship|visa|citizen|permanent resident|security clearance)\b/i.test(line))).slice(0, 15);
  const benefits = unique(sectionLines(lines, /^(benefits|what we offer|perks)/i)).slice(0, 25);

  const compensationMatch = /(?:USD|CAD|EUR|GBP)?\s*([$€£])?\s*(\d{2,3}(?:,\d{3})+|\d{2,3}(?:\.\d+)?\s*[kK])\s*(?:-|–|to)\s*(?:[$€£])?\s*(\d{2,3}(?:,\d{3})+|\d{2,3}(?:\.\d+)?\s*[kK])(?:\s*(?:per|\/)\s*(hour|month|year))?/i.exec(source);
  const money = (value?: string) => value ? Number(value.replace(/,/g, "").replace(/k/i, "")) * (/k/i.test(value) ? 1_000 : 1) : null;
  const currency = /\bCAD\b|C\$/i.test(source) ? "CAD" : /\bEUR\b|€/i.test(source) ? "EUR" : /\bGBP\b|£/i.test(source) ? "GBP" : compensationMatch ? "USD" : null;
  const locationText = input.location?.trim() || lines.find((line) => /\b(remote|hybrid|on-?site|[A-Z][a-z]+,\s*[A-Z]{2})\b/.test(line)) || "";
  const workArrangement: JobStructuredData["workArrangement"] = /\bhybrid\b/i.test(source) ? "hybrid" : /\bremote\b/i.test(source) ? "remote" : /\b(on-?site|in office)\b/i.test(source) ? "onsite" : "unknown";
  const deadline = /(?:application deadline|apply by|closing date)\s*[:\-]?\s*([^\n.]{4,40})/i.exec(source)?.[1]?.trim() ?? "";
  const postingDate = /(?:posted|posting date)\s*[:\-]?\s*([^\n.]{4,40})/i.exec(source)?.[1]?.trim() ?? "";

  const data: JobStructuredData = {
    company: input.company,
    roleTitle: input.roleTitle,
    seniority: inferSeniority(input.roleTitle),
    location: locationText,
    workArrangement,
    responsibilities: unique(responsibilityLines),
    requiredSkills: unique(requiredSkills),
    preferredSkills: unique(preferredSkills),
    yearsExperience: { min: yearMins.length ? Math.min(...yearMins) : null, max: yearMaxes.length ? Math.max(...yearMaxes) : null },
    educationRequirements,
    workAuthorizationRequirements,
    compensation: { currency, min: money(compensationMatch?.[2]), max: money(compensationMatch?.[3]), period: (compensationMatch?.[4]?.toLocaleLowerCase() as "hour" | "month" | "year" | undefined) ?? (compensationMatch ? "year" : null) },
    benefits,
    industry: "",
    roleCategory: inferRoleCategory(input.roleTitle),
    applicationDeadline: deadline,
    postingDate,
  };
  const warnings = [
    !source.trim() ? "No job description text was provided." : "",
    !data.requiredSkills.length ? "No required skills were confidently classified; review the job text manually." : "",
    !data.responsibilities.length ? "Responsibilities were not clearly labeled in the source text." : "",
    !data.workAuthorizationRequirements.length ? "No explicit work-authorization requirement was detected." : "",
  ].filter(Boolean);
  const fieldConfidence = Object.fromEntries(Object.entries(data).map(([field, value]) => [field, field === "company" || field === "roleTitle" ? 1 : Array.isArray(value) ? (value.length ? 0.78 : 0.35) : value && typeof value === "object" ? 0.62 : value ? 0.72 : 0.35]));
  return parsedJobSchema.parse({ data, fieldConfidence, warnings });
}
