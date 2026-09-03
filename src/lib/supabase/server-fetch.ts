import "server-only";

import { Agent, fetch as undiciFetch } from "undici";

/**
 * Node's global fetch (bundled undici) reuses HTTP/2 sessions to Supabase.
 * When Supabase closes an idle session, in-flight requests on it fail with
 * `TypeError: fetch failed` / `ERR_HTTP2_INVALID_SESSION` instead of being
 * retried on a fresh connection, which surfaces as a server runtime error.
 * Routing Supabase traffic through a dispatcher with HTTP/2 disabled avoids
 * the broken session-reuse path entirely.
 */
const dispatcher = new Agent({
  allowH2: false,
  connections: 32,
  headersTimeout: 30_000,
  bodyTimeout: 30_000,
});

export const supabaseServerFetch: typeof fetch = (input, init) =>
  undiciFetch(input as Parameters<typeof undiciFetch>[0], {
    ...(init as object),
    dispatcher,
  }) as unknown as Promise<Response>;
