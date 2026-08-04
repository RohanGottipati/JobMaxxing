import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiErrorCode = "VALIDATION" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "UNAVAILABLE" | "INTERNAL";

export function apiError(code: ApiErrorCode, message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status });
}

export function routeError(error: unknown) {
  if (error instanceof ZodError) return apiError("VALIDATION", "The request contains invalid fields.", 400, { fieldErrors: error.flatten().fieldErrors });
  const message = error instanceof Error
    ? error.message
    : error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : "Unexpected request failure.";
  const databaseCode = error && typeof error === "object" && "code" in error && typeof error.code === "string"
    ? error.code
    : null;
  if (/AI_RATE_LIMITED/i.test(message)) {
    const resetAt = /AI_RATE_LIMITED:([^"]+)/i.exec(message)?.[1]?.trim();
    return apiError("RATE_LIMITED", "You reached the daily limit for this AI action. Try again after the reset time.", 429, resetAt ? { resetAt } : undefined);
  }
  if (/AI_CONSENT_REQUIRED/i.test(message)) return apiError("FORBIDDEN", "Enable AI processing consent in your profile before sending career data to an AI provider.", 403);
  if (/JOB_URL_UNSUPPORTED/i.test(message)) return apiError("VALIDATION", "Enter a supported HTTPS job URL from Greenhouse, Lever, Ashby, Workday, iCIMS, Workable, SmartRecruiters, LinkedIn, or Indeed.", 422);
  if (/JOB_IMPORT_TOO_LARGE/i.test(message)) return apiError("VALIDATION", "The job page is too large to import safely. Paste the description instead.", 413);
  if (/JOB_IMPORT_UNSUPPORTED_CONTENT/i.test(message)) return apiError("VALIDATION", "The job URL did not return a supported HTML or plain-text page.", 422);
  if (/JOB_IMPORT_EMPTY/i.test(message)) return apiError("VALIDATION", "No usable job description was found at that URL. Paste the description instead.", 422);
  if (/JOB_IMPORT_UNAVAILABLE/i.test(message)) return apiError("UNAVAILABLE", "The job page could not be imported. It may block automated access; paste the description instead.", 503);
  if (/UNSUPPORTED_CLAIMS/i.test(message)) return apiError("VALIDATION", "The proposed content contains unsupported claims and cannot be accepted.", 422);
  if (/auth/i.test(message)) return apiError("UNAUTHORIZED", "Sign in to continue.", 401);
  if (databaseCode === "42501") return apiError("FORBIDDEN", "You do not have permission to perform this action.", 403);
  if (["P0002", "PGRST116"].includes(databaseCode ?? "") || /not found|missing/i.test(message)) return apiError("NOT_FOUND", "The requested item was not found.", 404);
  if (["23503", "23514", "22023", "22P02"].includes(databaseCode ?? "")) return apiError("VALIDATION", "The request contains an invalid or mismatched value.", 422);
  if (["40001", "23505", "55000"].includes(databaseCode ?? "") || /changed in another|changed after|conflict|confirm the parsed/i.test(message)) return apiError("CONFLICT", "This item is out of date or not ready for that action. Reload and retry the required step.", 409);
  if (/AI_UNAVAILABLE/i.test(message)) return apiError("UNAVAILABLE", "AI assistance is unavailable. Deterministic parsing is still available.", 503);
  return apiError("INTERNAL", "The operation could not be completed.", 500);
}
