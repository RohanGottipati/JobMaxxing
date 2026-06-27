"use server";

import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { placeholderRedirectParam } from "@/lib/applications/repository";
import { parseApplicationStatus } from "@/lib/applications/status";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(formData: FormData, key: string) {
  const value = readText(formData, key);
  return value.length ? value : null;
}

function readApplicationInput(formData: FormData) {
  const companyName = readText(formData, "company_name");
  const jobTitle = readText(formData, "job_title");
  const status = parseApplicationStatus(formData.get("status")) ?? "saved";

  if (!companyName || !jobTitle) {
    redirect("/applications/new?error=missing-required");
  }

  return {
    companyName,
    jobTitle,
    status,
    jobUrl: readOptionalText(formData, "job_url"),
    location: readOptionalText(formData, "location"),
    appliedAt: readOptionalText(formData, "applied_at"),
    jobDescription: readOptionalText(formData, "job_description"),
    notes: readOptionalText(formData, "notes"),
  };
}

function readApplicationId(formData: FormData) {
  const id = readText(formData, "application_id");

  if (!id) {
    redirect(`/applications?${placeholderRedirectParam("missing-id")}`);
  }

  return id;
}

export async function createApplication(formData: FormData) {
  await requireCurrentUser();
  readApplicationInput(formData);

  redirect(`/applications?${placeholderRedirectParam("created")}`);
}

export async function updateApplication(formData: FormData) {
  await requireCurrentUser();
  const id = readApplicationId(formData);
  readApplicationInput(formData);

  redirect(`/applications/${encodeURIComponent(id)}?${placeholderRedirectParam("updated")}`);
}

export async function deleteApplication(formData: FormData) {
  await requireCurrentUser();
  readApplicationId(formData);

  redirect(`/applications?${placeholderRedirectParam("deleted")}`);
}

export async function uploadDocumentPlaceholder(formData: FormData) {
  await requireCurrentUser();
  const id = readApplicationId(formData);

  redirect(`/applications/${encodeURIComponent(id)}?${placeholderRedirectParam("uploaded")}`);
}
