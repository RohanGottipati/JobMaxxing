import { findUnsupportedMetrics } from "@/lib/maxwell/claims";

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9+#.%$€£]+/g, " ").replace(/\s+/g, " ").trim();
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

const GENERIC_REWRITE_TERMS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "because", "been", "being",
  "by", "for", "from", "had", "has", "have", "in", "into", "is", "it", "its",
  "of", "on", "or", "that", "the", "their", "them", "they", "this", "through",
  "to", "using", "was", "were", "with", "across", "also", "while",
  "accept", "achieved", "another", "application", "apply", "applying", "background", "bring", "built", "candidate", "collaborated",
  "consideration", "considering", "contribute", "contribution", "created", "dear", "delivered",
  "designed", "detail", "developed", "directly", "discuss", "evidence", "example", "excited",
  "enabled", "enhanced", "established", "experience", "implemented", "improved",
  "further", "hiring", "includes", "interest", "interested", "letter", "maintained", "opportunity",
  "optimized", "please", "practical", "project", "qualifications", "reduced", "relevant", "role",
  "service", "sincerely", "solution", "strengths", "support", "supporting", "system", "team",
  "technical", "thank", "verified", "welcome", "work", "worked", "would",
  "your",
]);

function termTokens(value: string) {
  return normalize(value)
    .split(" ")
    .map((token) => token.replace(/^[^a-z0-9+#]+|[^a-z0-9+#]+$/g, ""))
    .filter(Boolean);
}

export function findUnsupportedNovelTerms(
  text: string,
  sources: string[],
  ignoredTerms: string[] = [],
) {
  const corpusTokens = new Set(termTokens(sources.join("\n")));
  const ignored = new Set(
    ignoredTerms.flatMap(termTokens),
  );
  return unique(
    termTokens(text)
      .filter((token) =>
        token.length >= 4 &&
        !/^\d/.test(token) &&
        !corpusTokens.has(token) &&
        !ignored.has(token) &&
        !GENERIC_REWRITE_TERMS.has(token),
      ),
  );
}

export type GroundingResult = {
  unsupportedClaims: string[];
  supportedSkills: string[];
  supportedMetrics: string[];
};

export function validateGroundedText(input: {
  text: string;
  sources: string[];
  disclosedUnsupportedClaims?: string[];
  skillsAdded?: string[];
  metricsAdded?: string[];
  allowedSkills?: string[];
}): GroundingResult {
  const corpus = normalize(input.sources.join("\n"));
  const allowedSkills = new Map((input.allowedSkills ?? []).map((skill) => [normalize(skill), skill]));
  const unsupported = [...(input.disclosedUnsupportedClaims ?? [])];
  const supportedSkills: string[] = [];
  const supportedMetrics: string[] = [];

  for (const skill of unique(input.skillsAdded ?? [])) {
    const normalized = normalize(skill);
    if (allowedSkills.has(normalized) || (normalized.length > 1 && corpus.includes(normalized))) supportedSkills.push(skill);
    else unsupported.push(`Unsupported skill: ${skill}`);
  }

  for (const metric of unique(input.metricsAdded ?? [])) {
    if (corpus.includes(normalize(metric))) supportedMetrics.push(metric);
    else unsupported.push(`Unsupported metric: ${metric}`);
  }

  unsupported.push(...findUnsupportedMetrics(input.text, input.sources).map((metric) => `Unsupported metric: ${metric}`));
  unsupported.push(
    ...findUnsupportedNovelTerms(
      input.text,
      input.sources,
      [...(input.skillsAdded ?? []), ...(input.metricsAdded ?? [])],
    ).map((term) => `Unsupported factual wording: ${term}`),
  );

  return {
    unsupportedClaims: unique(unsupported),
    supportedSkills: unique(supportedSkills),
    supportedMetrics: unique(supportedMetrics),
  };
}

export function assertGroundedText(input: Parameters<typeof validateGroundedText>[0]) {
  const result = validateGroundedText(input);
  if (result.unsupportedClaims.length) {
    throw new Error(`UNSUPPORTED_CLAIMS:${result.unsupportedClaims.slice(0, 5).join(" | ")}`);
  }
  return result;
}
