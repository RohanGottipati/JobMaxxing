import { createClient } from "@/lib/supabase/server";
import type { ProfileExperienceKind } from "@/types/database";

export type ProfileLinkInput = {
  label: string;
  url: string;
};

export type ExperienceInput = {
  kind: ProfileExperienceKind;
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  responsibilities: string;
};

export type EducationInput = {
  school: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  details: string;
};

export type ProjectInput = {
  title: string;
  date: string;
  url: string;
  description: string;
  techStack: string;
};

export type AchievementInput = {
  title: string;
  description: string;
  date: string;
};

export type CareerProfilePayload = {
  fullName: string;
  headline: string;
  phone: string;
  location: string;
  summary: string;
  additionalInfo: string;
  links: ProfileLinkInput[];
  experiences: ExperienceInput[];
  volunteer: ExperienceInput[];
  education: EducationInput[];
  projects: ProjectInput[];
  skills: string[];
  achievements: AchievementInput[];
};

export type CareerProfile = CareerProfilePayload & {
  email: string | null;
  memberSince: string | null;
};

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be signed in to view your profile.");
  }

  return { supabase, userId: user.id, email: user.email ?? null };
}

export async function getCareerProfile(): Promise<CareerProfile> {
  const { supabase, userId, email } = await getAuthContext();

  const [
    profile,
    links,
    experiences,
    education,
    projects,
    skills,
    achievements,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("profile_links")
      .select("*")
      .eq("user_id", userId)
      .order("position", { ascending: true }),
    supabase
      .from("profile_experiences")
      .select("*")
      .eq("user_id", userId)
      .order("position", { ascending: true }),
    supabase
      .from("profile_education")
      .select("*")
      .eq("user_id", userId)
      .order("position", { ascending: true }),
    supabase
      .from("profile_projects")
      .select("*")
      .eq("user_id", userId)
      .order("position", { ascending: true }),
    supabase
      .from("profile_skills")
      .select("*")
      .eq("user_id", userId)
      .order("position", { ascending: true }),
    supabase
      .from("profile_achievements")
      .select("*")
      .eq("user_id", userId)
      .order("position", { ascending: true }),
  ]);

  const allExperiences = experiences.data ?? [];

  return {
    email,
    memberSince: profile.data?.created_at ?? null,
    fullName: profile.data?.full_name ?? "",
    headline: profile.data?.headline ?? "",
    phone: profile.data?.phone ?? "",
    location: profile.data?.location ?? "",
    summary: profile.data?.summary ?? "",
    additionalInfo: profile.data?.additional_info ?? "",
    links: (links.data ?? []).map((row) => ({
      label: row.label ?? "",
      url: row.url ?? "",
    })),
    experiences: allExperiences
      .filter((row) => row.kind === "work")
      .map(toExperienceInput),
    volunteer: allExperiences
      .filter((row) => row.kind === "volunteer")
      .map(toExperienceInput),
    education: (education.data ?? []).map((row) => ({
      school: row.school ?? "",
      degree: row.degree ?? "",
      field: row.field ?? "",
      location: row.location ?? "",
      startDate: row.start_date ?? "",
      endDate: row.end_date ?? "",
      isCurrent: row.is_current ?? false,
      details: row.details ?? "",
    })),
    projects: (projects.data ?? []).map((row) => ({
      title: row.title ?? "",
      date: row.date ?? "",
      url: row.url ?? "",
      description: row.description ?? "",
      techStack: row.tech_stack ?? "",
    })),
    skills: (skills.data ?? []).map((row) => row.name).filter(Boolean),
    achievements: (achievements.data ?? []).map((row) => ({
      title: row.title ?? "",
      description: row.description ?? "",
      date: row.date ?? "",
    })),
  };
}

function toExperienceInput(row: {
  kind: ProfileExperienceKind;
  job_title: string;
  company: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  responsibilities: string | null;
}): ExperienceInput {
  return {
    kind: row.kind,
    jobTitle: row.job_title ?? "",
    company: row.company ?? "",
    location: row.location ?? "",
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    isCurrent: row.is_current ?? false,
    responsibilities: row.responsibilities ?? "",
  };
}
