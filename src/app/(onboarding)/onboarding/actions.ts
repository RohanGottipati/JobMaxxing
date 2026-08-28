"use server";

import { z } from "zod";

import {
  saveOnboardingPreferences,
  saveOnboardingProfile,
  updateOnboardingStatus,
} from "@/lib/onboarding/repository";
import { careerStageSchema } from "@/lib/career/schemas";

const list = z.array(z.string().trim().min(1).max(100)).max(20);

export async function saveBasicsAction(input: unknown) {
  const parsed = z.object({
    fullName: z.string().trim().min(1).max(240),
    headline: z.string().trim().max(240),
    careerStage: careerStageSchema,
  }).safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Check the highlighted profile fields." };
  await saveOnboardingProfile({ ...parsed.data, nextStep: 2 });
  return { ok: true as const, nextStep: 2 };
}

export async function saveTargetsAction(input: unknown) {
  const parsed = z.object({ targetRoles: list, preferredLocations: list }).safeParse(input);
  if (!parsed.success || !parsed.data.targetRoles.length) return { ok: false as const, message: "Add at least one target role." };
  await saveOnboardingPreferences({
    target_roles: parsed.data.targetRoles,
    preferred_locations: parsed.data.preferredLocations,
    work_arrangements: [],
    nextStep: 4,
  });
  return { ok: true as const, nextStep: 4 };
}

export async function savePreferencesAction(input: unknown) {
  const parsed = z.object({
    targetRoles: list,
    preferredLocations: list,
    workArrangements: z.array(z.enum(["remote", "hybrid", "onsite"])).max(3),
  }).safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Check your work preferences." };
  await saveOnboardingPreferences({
    target_roles: parsed.data.targetRoles,
    preferred_locations: parsed.data.preferredLocations,
    work_arrangements: parsed.data.workArrangements,
    nextStep: 5,
  });
  return { ok: true as const, nextStep: 5 };
}

export async function markResumeStepAction() {
  await updateOnboardingStatus({ status: "in_progress", step: 3 });
  return { ok: true as const, nextStep: 3 };
}

export async function deferOnboardingAction(step: number) {
  const safeStep = z.number().int().min(1).max(5).parse(step);
  await updateOnboardingStatus({ status: "deferred", step: safeStep });
  return { ok: true as const };
}

export async function completeOnboardingAction(aiConsent: boolean) {
  await updateOnboardingStatus({ status: "completed", step: 5, aiConsent });
  return { ok: true as const };
}

