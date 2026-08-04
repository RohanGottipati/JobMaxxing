"use server";

import { revalidatePath } from "next/cache";

import type { CareerProfileV1 } from "@/lib/career/schemas";
import { saveCanonicalCareerProfile } from "@/lib/career/repository";

export type SaveProfileResult =
  | { ok: true; revision: number }
  | { ok: false; code: "conflict" | "validation" | "unknown"; message: string };

export async function saveProfileAction(payload: CareerProfileV1): Promise<SaveProfileResult> {
  try {
    const revision = await saveCanonicalCareerProfile(payload);
    revalidatePath("/profile");
    revalidatePath("/resumes");
    return { ok: true, revision };
  } catch (error) {
    const candidate = error as { code?: string; message?: string };
    if (candidate.code === "40001" || candidate.message?.includes("another session")) {
      return {
        ok: false,
        code: "conflict",
        message: "Your profile changed in another session. Reload before saving again.",
      };
    }
    if (candidate.code === "22023" || candidate.message?.includes("validation")) {
      return {
        ok: false,
        code: "validation",
        message: "Some profile fields are invalid. Review the highlighted values and try again.",
      };
    }
    console.error("Canonical career profile save failed", {
      code: candidate.code ?? "unknown",
    });
    return {
      ok: false,
      code: "unknown",
      message: "Your profile could not be saved. Try again.",
    };
  }
}
