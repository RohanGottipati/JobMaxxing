"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateProfile } from "@/lib/profile/repository";

function readOptionalText(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function saveProfile(formData: FormData) {
  await updateProfile({
    full_name: readOptionalText(formData, "full_name"),
    headline: readOptionalText(formData, "headline"),
  });

  revalidatePath("/profile");
  redirect("/profile?saved=1");
}
