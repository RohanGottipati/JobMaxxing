"use server";

import { revalidatePath } from "next/cache";

import {
  clearCareerProfile,
  saveCareerProfile,
  type CareerProfilePayload,
} from "@/lib/profile/career";

export async function saveProfileAction(payload: CareerProfilePayload) {
  await saveCareerProfile(payload);
  revalidatePath("/profile");
}

export async function clearProfileAction() {
  await clearCareerProfile();
  revalidatePath("/profile");
}
