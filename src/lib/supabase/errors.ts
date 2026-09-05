import type { PostgrestError } from "@supabase/supabase-js";

/**
 * PostgrestError is a plain object, not an Error instance. Throwing it raw
 * escapes Next.js error boundaries (the page renders the raw
 * `{ code, details, hint, message }` object), so wrap it before it crosses
 * a page or route boundary. The PostgREST code stays on the wrapper because
 * `databaseErrorCode` in `@/lib/http/api` reads it to map route responses.
 */
export class DatabaseError extends Error {
  readonly code: string;
  readonly details: string;
  readonly hint: string;

  constructor(error: PostgrestError) {
    super(error.code ? `${error.message} (code ${error.code})` : error.message);
    this.name = "DatabaseError";
    this.code = error.code;
    this.details = error.details;
    this.hint = error.hint;
  }
}
