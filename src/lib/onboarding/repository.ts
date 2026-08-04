import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Preferences = Database["public"]["Tables"]["career_preferences"]["Row"];

async function context() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Authentication is required.");
  return { supabase, userId: user.id, email: user.email ?? null };
}

export async function getOnboardingState() {
  const { supabase, userId, email } = await context();
  const [profile, preferences, resumes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("career_preferences").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("resumes").select("id, name").eq("user_id", userId).order("updated_at", { ascending: false }).limit(5),
  ]);
  const error = profile.error ?? preferences.error ?? resumes.error;
  if (error) throw error;
  if (!profile.data) throw new Error("Your profile could not be loaded.");
  return {
    email,
    profile: profile.data,
    preferences: preferences.data,
    resumes: resumes.data ?? [],
  };
}

export async function saveOnboardingProfile(input: {
  fullName: string;
  headline: string;
  careerStage: Profile["career_stage"];
  nextStep: number;
}) {
  const { supabase, userId } = await context();
  const { error } = await supabase.from("profiles").update({
    full_name: input.fullName,
    headline: input.headline || null,
    career_stage: input.careerStage,
    onboarding_status: "in_progress",
    onboarding_step: input.nextStep,
  }).eq("id", userId);
  if (error) throw error;
}

export async function saveOnboardingPreferences(input: Pick<Preferences, "target_roles" | "preferred_locations" | "work_arrangements"> & { nextStep: number }) {
  const { supabase, userId } = await context();
  const { error: preferenceError } = await supabase.from("career_preferences").upsert({
    user_id: userId,
    target_roles: input.target_roles,
    preferred_locations: input.preferred_locations,
    work_arrangements: input.work_arrangements,
  }, { onConflict: "user_id" });
  if (preferenceError) throw preferenceError;
  const { error } = await supabase.from("profiles").update({
    onboarding_status: "in_progress",
    onboarding_step: input.nextStep,
  }).eq("id", userId);
  if (error) throw error;
}

export async function updateOnboardingStatus(input: {
  status: "in_progress" | "deferred" | "completed";
  step: number;
  aiConsent?: boolean;
}) {
  const { supabase, userId } = await context();
  const now = new Date().toISOString();
  const { error } = await supabase.from("profiles").update({
    onboarding_status: input.status,
    onboarding_step: input.step,
    onboarding_deferred_at: input.status === "deferred" ? now : null,
    onboarding_completed_at: input.status === "completed" ? now : null,
    ai_processing_consent_at: input.aiConsent === undefined ? undefined : input.aiConsent ? now : null,
  }).eq("id", userId);
  if (error) throw error;
}
