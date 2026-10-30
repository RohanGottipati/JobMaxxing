/**
 * Job links are rendered as clickable links, so only http(s) URLs are stored
 * (the database enforces the same rule). A bare host such as
 * "company.com/jobs/1" is treated as https; any other scheme is dropped.
 */
export function normalizeJobUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, "")}`;
  try {
    const url = new URL(candidate);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) return null;
    return /\s/.test(url.href) ? null : url.href;
  } catch {
    return null;
  }
}
