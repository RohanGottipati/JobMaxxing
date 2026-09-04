"use server";

import { z } from "zod";

import {
  saveOnboardingSetup,
  updateOnboardingStatus,
} from "@/lib/onboarding/repository";
import { careerStageSchema } from "@/lib/career/schemas";

const list = z.array(z.string().trim().min(1).max(100)).max(20);

export async function saveSetupAction(input: unknown) {
  const parsed = z.object({
    fullName: z.string().trim().min(1).max(240),
    headline: z.string().trim().max(240),
    careerStage: careerStageSchema,
    targetRoles: list.min(1),
    preferredLocations: list,
    workArrangements: z.array(z.enum(["remote", "hybrid", "onsite"])).max(3),
  }).safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Add your name and at least one target role." };
  }
  await saveOnboardingSetup({
    fullName: parsed.data.fullName,
    headline: parsed.data.headline,
    careerStage: parsed.data.careerStage,
    targetRoles: parsed.data.targetRoles,
    preferredLocations: parsed.data.preferredLocations,
    workArrangements: parsed.data.workArrangements,
    nextStep: 2,
  });
  return { ok: true as const, nextStep: 2 };
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
