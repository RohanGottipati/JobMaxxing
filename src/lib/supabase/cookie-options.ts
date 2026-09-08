import type { CookieOptions } from "@supabase/ssr";

import { getSiteUrl } from "@/lib/site";

/**
 * The Supabase auth session lives in cookies. By default those cookies are
 * host-only, so a session created on `www.jobmaxxing.app` is not sent back on
 * `jobmaxxing.app` (and vice versa). When a return visit or an apex<->www
 * redirect lands on the other host, the browser omits the auth cookie, the
 * refresh call ships a stale/empty token, and Supabase answers
 * `Invalid Refresh Token: Refresh Token Not Found` — logging the user out.
 *
 * Scoping the cookie to the registrable domain (`jobmaxxing.app`) lets the apex
 * and every subdomain share one session. Local development must stay host-only,
 * because browsers reject a `Domain` attribute for `localhost`/IP hosts.
 */
function isIpAddress(host: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  // IPv6 literals (with or without the URL bracket form) contain a colon.
  return host.includes(":");
}

/**
 * Resolve the cookie `Domain` for auth cookies.
 * - An explicit override (`NEXT_PUBLIC_COOKIE_DOMAIN`) always wins.
 * - Otherwise derive it from the app origin, stripping a leading `www.`.
 * - Local/loopback hosts return `undefined` so cookies stay host-only.
 */
export function resolveCookieDomain(
  explicitDomain: string | undefined,
  appUrl: string | undefined,
): string | undefined {
  const explicit = explicitDomain?.trim();
  if (explicit) return explicit;

  const origin = appUrl?.trim();
  if (!origin) return undefined;

  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return undefined;
  }

  if (!host || host === "localhost" || host.endsWith(".localhost")) {
    return undefined;
  }
  if (isIpAddress(host)) return undefined;

  return host.startsWith("www.") ? host.slice(4) : host;
}

/**
 * Cookie options to pass to the Supabase browser and server clients. Only sets
 * `domain` when one applies; everything else keeps the library defaults
 * (400-day max age, path `/`, `SameSite=Lax`, `Secure` in production).
 */
export function supabaseCookieOptions(): CookieOptions | undefined {
  // Derive from the canonical site URL so the domain still resolves when
  // NEXT_PUBLIC_APP_URL is unset in production (getSiteUrl defaults to the
  // deployed origin); an explicit NEXT_PUBLIC_COOKIE_DOMAIN still wins.
  const domain = resolveCookieDomain(
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
    getSiteUrl().toString(),
  );

  return domain ? { domain } : undefined;
}
