const METRIC_PATTERN = /(?:[$€£]\s?\d[\d,.]*(?:\s?(?:k|m|b|million|billion|thousand))?|\d[\d,.]*\s?(?:%|percent|x\b|\+|ms\b|milliseconds?\b|seconds?\b|minutes?\b|hours?\b|days?\b|weeks?\b|months?\b|years?\b|users?\b|customers?\b|clients?\b|requests?\b|transactions?\b|revenue\b|costs?\b)|\d{1,3}(?:,\d{3})+)/gi;

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").replace(/\s+([%+])/g, "$1").trim();
}

export function findUnsupportedMetrics(content: string | null | undefined, sources: Array<unknown>) {
  if (!content) return [];
  const corpus = normalize(sources.map((source) => typeof source === "string" ? source : JSON.stringify(source)).join("\n"));
  return [...new Set(content.match(METRIC_PATTERN) ?? [])].filter((claim) => !corpus.includes(normalize(claim)));
}

export function assertGeneratedDocumentSafe(input: {
  content: string | null | undefined;
  unsupportedClaims: string[];
  sources: Array<unknown>;
}) {
  const disclosed = input.unsupportedClaims.map((claim) => claim.trim()).filter(Boolean);
  const unsupportedMetrics = findUnsupportedMetrics(input.content, input.sources);
  const unsupported = [...new Set([...disclosed, ...unsupportedMetrics])];
  if (unsupported.length) {
    throw new Error(`Generated content contains unsupported claims and was not saved: ${unsupported.slice(0, 5).join("; ")}`);
  }
}

export function storedUnsupportedClaims(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const claims = (metadata as { unsupported_claims?: unknown }).unsupported_claims;
  return Array.isArray(claims) ? claims.filter((claim): claim is string => typeof claim === "string" && Boolean(claim.trim())) : [];
}

export function assertNoStoredUnsupportedClaims(metadata: unknown) {
  const claims = storedUnsupportedClaims(metadata);
  if (claims.length) throw new Error("Resolve or remove every unsupported claim before marking this document as submitted.");
}
