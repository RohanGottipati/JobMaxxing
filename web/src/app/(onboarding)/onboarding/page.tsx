import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getOnboardingState } from "@/lib/onboarding/repository";

export default async function OnboardingPage() {
  const state = await getOnboardingState();
  if (state.profile.onboarding_status === "completed") redirect("/dashboard");
  return <OnboardingWizard initial={state} />;
}

