import { createHash } from "node:crypto";

export function normalizeJobDescription(text: string) {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function hashJobDescription(text: string) {
  const normalized = normalizeJobDescription(text);
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex");
}
