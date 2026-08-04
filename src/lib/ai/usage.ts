import "server-only";

import { getGeminiModel, isGeminiConfigured } from "@/lib/ai/gemini";
import { createClient } from "@/lib/supabase/server";

export const AI_ACTIONS = [
  "bullet_rewrite",
  "resume_analysis",
  "job_parse",
  "job_match",
  "resume_tailoring",
  "cover_letter_generation",
] as const;

export type AiAction = (typeof AI_ACTIONS)[number];
export type AiResourceType = "profile_bullet" | "resume" | "resume_version" | "application";

async function context() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Authentication is required.");
  return { supabase, userId: user.id };
}

export async function beginAiOperation(input: {
  action: AiAction;
  resourceType?: AiResourceType;
  resourceId?: string;
}) {
  const { supabase, userId } = await context();
  const { data, error } = await supabase.rpc("claim_ai_usage", {
    p_action: input.action,
    p_resource_type: input.resourceType ?? null,
    p_resource_id: input.resourceId ?? null,
  });
  if (error) throw error;
  const claim = data?.[0];
  if (!claim) throw new Error("AI usage claim did not return a result.");

  return {
    supabase,
    userId,
    remaining: claim.remaining,
    limit: claim.limit_value,
    resetAt: claim.reset_at,
    startedAt: performance.now(),
  };
}

export async function externalAiAvailability() {
  if (!isGeminiConfigured()) return { available: false as const, reason: "not_configured" as const };
  const { supabase, userId } = await context();
  const { data, error } = await supabase
    .from("profiles")
    .select("ai_processing_consent_at")
    .eq("id", userId)
    .single();
  if (error) throw error;
  if (!data.ai_processing_consent_at) return { available: false as const, reason: "consent_required" as const };
  return { available: true as const, model: getGeminiModel() };
}

export async function recordAiAudit(input: {
  action: AiAction;
  outcome: "succeeded" | "failed" | "fallback";
  resourceType?: AiResourceType;
  resourceId?: string;
  model?: string | null;
  startedAt: number;
  errorCode?: string | null;
}) {
  try {
    const { supabase, userId } = await context();
    const { error } = await supabase.from("ai_audit_events").insert({
      user_id: userId,
      action: input.action,
      outcome: input.outcome,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId ?? null,
      model: input.model ?? null,
      duration_ms: Math.max(0, Math.round(performance.now() - input.startedAt)),
      error_code: input.errorCode?.slice(0, 120) ?? null,
    });
    if (error) console.error("[ai-audit] Failed to persist event", { action: input.action, code: error.code });
  } catch (error) {
    console.error("[ai-audit] Failed to record event", {
      action: input.action,
      code: error instanceof Error ? error.name : "unknown",
    });
  }
}

export function safeAiErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : "unknown";
  if (/abort|timeout/i.test(message)) return "timeout";
  if (/429|quota|rate/i.test(message)) return "provider_rate_limited";
  if (/AI_EMPTY_RESPONSE/i.test(message)) return "empty_response";
  if (/AI_UNAVAILABLE/i.test(message)) return "not_configured";
  return "generation_failed";
}
