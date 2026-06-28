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

function clean(value: string) {
  return value.trim();
}

function isExperienceEmpty(item: ExperienceInput) {
  return (
    !clean(item.jobTitle) &&
    !clean(item.company) &&
    !clean(item.location) &&
    !clean(item.responsibilities)
  );
}

function isEducationEmpty(item: EducationInput) {
  return (
    !clean(item.school) &&
    !clean(item.degree) &&
    !clean(item.field) &&
    !clean(item.details)
  );
}

function isProjectEmpty(item: ProjectInput) {
  return (
    !clean(item.title) && !clean(item.description) && !clean(item.techStack)
  );
}

function isAchievementEmpty(item: AchievementInput) {
  return !clean(item.title) && !clean(item.description);
}

function nullable(value: string) {
  const trimmed = clean(value);
  return trimmed.length ? trimmed : null;
}

export async function saveCareerProfile(payload: CareerProfilePayload) {
  const { supabase, userId } = await getAuthContext();

  const profileUpdate = {
    id: userId,
    full_name: nullable(payload.fullName),
    phone: nullable(payload.phone),
    location: nullable(payload.location),
    summary: nullable(payload.summary),
    additional_info: nullable(payload.additionalInfo),
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(profileUpdate, { onConflict: "id" });
  if (profileError) throw profileError;

  const experiences = [...payload.experiences, ...payload.volunteer].filter(
    (item) => !isExperienceEmpty(item),
  );

  await replaceRows("profile_links", userId, supabase, () =>
    payload.links
      .filter((item) => clean(item.label) || clean(item.url))
      .map((item, index) => ({
        user_id: userId,
        label: clean(item.label),
        url: clean(item.url),
        position: index,
      })),
  );

  await replaceRows("profile_experiences", userId, supabase, () =>
    experiences.map((item, index) => ({
      user_id: userId,
      kind: item.kind,
      job_title: clean(item.jobTitle),
      company: clean(item.company),
      location: nullable(item.location),
      start_date: nullable(item.startDate),
      end_date: item.isCurrent ? null : nullable(item.endDate),
      is_current: item.isCurrent,
      responsibilities: nullable(item.responsibilities),
      position: index,
    })),
  );

  await replaceRows("profile_education", userId, supabase, () =>
    payload.education.filter((item) => !isEducationEmpty(item)).map((item, index) => ({
      user_id: userId,
      school: clean(item.school),
      degree: nullable(item.degree),
      field: nullable(item.field),
      location: nullable(item.location),
      start_date: nullable(item.startDate),
      end_date: item.isCurrent ? null : nullable(item.endDate),
      is_current: item.isCurrent,
      details: nullable(item.details),
      position: index,
    })),
  );

  await replaceRows("profile_projects", userId, supabase, () =>
    payload.projects.filter((item) => !isProjectEmpty(item)).map((item, index) => ({
      user_id: userId,
      title: clean(item.title),
      date: nullable(item.date),
      url: nullable(item.url),
      description: nullable(item.description),
      tech_stack: nullable(item.techStack),
      position: index,
    })),
  );

  await replaceRows("profile_skills", userId, supabase, () =>
    payload.skills
      .map((name) => clean(name))
      .filter(Boolean)
      .map((name, index) => ({ user_id: userId, name, position: index })),
  );

  await replaceRows("profile_achievements", userId, supabase, () =>
    payload.achievements
      .filter((item) => !isAchievementEmpty(item))
      .map((item, index) => ({
        user_id: userId,
        title: clean(item.title),
        description: nullable(item.description),
        date: nullable(item.date),
        position: index,
      })),
  );
}

export async function clearCareerProfile() {
  const { supabase, userId } = await getAuthContext();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: null,
      phone: null,
      location: null,
      summary: null,
      additional_info: null,
    })
    .eq("id", userId);
  if (profileError) throw profileError;

  await Promise.all(
    SECTION_TABLES.map((table) =>
      supabase.from(table).delete().eq("user_id", userId),
    ),
  );
}

const SECTION_TABLES = [
  "profile_links",
  "profile_experiences",
  "profile_education",
  "profile_projects",
  "profile_skills",
  "profile_achievements",
] as const;

type SectionTable = (typeof SECTION_TABLES)[number];

type DynamicTable = {
  delete: () => { eq: (column: string, value: string) => Promise<{ error: unknown }> };
  insert: (rows: unknown) => Promise<{ error: unknown }>;
};

// Owned-row sections are small per user, so a delete-then-insert keeps the saved
// rows perfectly in sync with the editor without diffing individual records.
// The table name is dynamic, which collapses Supabase's per-table typing, so the
// builder is treated structurally here while the row shapes are built by callers.
async function replaceRows(
  table: SectionTable,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  build: () => Array<Record<string, unknown>>,
) {
  const builder = supabase.from(table) as unknown as DynamicTable;

  const { error: deleteError } = await builder.delete().eq("user_id", userId);
  if (deleteError) throw deleteError;

  const rows = build();
  if (!rows.length) return;

  const { error: insertError } = await (
    supabase.from(table) as unknown as DynamicTable
  ).insert(rows);
  if (insertError) throw insertError;
}
