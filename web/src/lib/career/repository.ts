import "server-only";

import { careerProfileV1Schema, type CareerProfileV1 } from "@/lib/career/schemas";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

type ProfileBulletRow = Database["public"]["Tables"]["profile_bullets"]["Row"];

async function authContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Authentication is required.");
  return { supabase, userId: user.id, email: user.email ?? null };
}

function textArray(value: Json): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function getCanonicalCareerProfile(): Promise<CareerProfileV1 & { email: string | null }> {
  const { supabase, userId, email } = await authContext();
  const [profile, preferences, links, experiences, education, projects, skills, achievements, certifications, publications, languages, bullets] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("career_preferences").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("profile_links").select("*").eq("user_id", userId).order("position"),
    supabase.from("profile_experiences").select("*").eq("user_id", userId).order("position"),
    supabase.from("profile_education").select("*").eq("user_id", userId).order("position"),
    supabase.from("profile_projects").select("*").eq("user_id", userId).order("position"),
    supabase.from("profile_skills").select("*").eq("user_id", userId).order("position"),
    supabase.from("profile_achievements").select("*").eq("user_id", userId).order("position"),
    supabase.from("profile_certifications").select("*").eq("user_id", userId).order("position"),
    supabase.from("profile_publications").select("*").eq("user_id", userId).order("position"),
    supabase.from("profile_languages").select("*").eq("user_id", userId).order("position"),
    supabase.from("profile_bullets").select("*").eq("user_id", userId).order("position"),
  ]);
  const error = profile.error ?? preferences.error ?? links.error ?? experiences.error ?? education.error ?? projects.error ?? skills.error ?? achievements.error ?? certifications.error ?? publications.error ?? languages.error ?? bullets.error;
  if (error) throw error;
  if (!profile.data) throw new Error("Your career profile could not be loaded.");

  const bulletRows = bullets.data ?? [];
  const base = {
    schemaVersion: 1 as const,
    revision: profile.data.profile_revision,
    fullName: profile.data.full_name ?? "",
    headline: profile.data.headline ?? "",
    phone: profile.data.phone ?? "",
    location: profile.data.location ?? "",
    summary: profile.data.summary ?? "",
    additionalInfo: profile.data.additional_info ?? "",
    careerStage: profile.data.career_stage as CareerProfileV1["careerStage"],
    links: (links.data ?? []).map((row) => ({ id: row.id, kind: row.kind, label: row.label, url: row.url })),
    experiences: (experiences.data ?? []).map((row) => ({
      id: row.id,
      kind: row.kind,
      jobTitle: row.job_title,
      company: row.company,
      location: row.location ?? "",
      startDate: row.start_date ?? "",
      endDate: row.end_date ?? "",
      isCurrent: row.is_current,
      originalText: row.original_text ?? row.responsibilities ?? "",
      approvedText: row.approved_text ?? row.responsibilities ?? "",
      technologies: row.technologies,
      demonstratedSkills: row.demonstrated_skills,
      metrics: textArray(row.metrics),
      sourceKind: row.source_kind,
      verificationStatus: row.verification_status,
      confidence: row.confidence,
      isLocked: row.is_locked,
      bullets: bulletRows.filter((bullet) => bullet.experience_id === row.id).map(mapBullet),
    })),
    education: (education.data ?? []).map((row) => ({ id: row.id, school: row.school, degree: row.degree ?? "", field: row.field ?? "", location: row.location ?? "", startDate: row.start_date ?? "", endDate: row.end_date ?? "", isCurrent: row.is_current, details: row.details ?? "" })),
    projects: (projects.data ?? []).map((row) => ({
      id: row.id, title: row.title, date: row.date ?? "", url: row.url ?? "",
      originalText: row.original_text ?? row.description ?? "", approvedText: row.approved_text ?? row.description ?? "",
      technologies: row.technologies.length ? row.technologies : (row.tech_stack ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      demonstratedSkills: row.demonstrated_skills, metrics: textArray(row.metrics), sourceKind: row.source_kind,
      verificationStatus: row.verification_status, confidence: row.confidence, isLocked: row.is_locked,
      bullets: bulletRows.filter((bullet) => bullet.project_id === row.id).map(mapBullet),
    })),
    skills: (skills.data ?? []).map((row) => ({ id: row.id, name: row.name })),
    achievements: (achievements.data ?? []).map((row) => ({ id: row.id, kind: row.kind, title: row.title, description: row.description ?? "", date: row.date ?? "" })),
    certifications: (certifications.data ?? []).map((row) => ({ id: row.id, name: row.name, issuer: row.issuer ?? "", issuedOn: row.issued_on ?? "", expiresOn: row.expires_on ?? "", credentialId: row.credential_id ?? "", credentialUrl: row.credential_url ?? "", sourceKind: row.source_kind, verificationStatus: row.verification_status, confidence: row.confidence, isLocked: row.is_locked })),
    publications: (publications.data ?? []).map((row) => ({ id: row.id, title: row.title, publisher: row.publisher ?? "", publishedOn: row.published_on ?? "", url: row.url ?? "", description: row.description ?? "", sourceKind: row.source_kind, verificationStatus: row.verification_status, confidence: row.confidence, isLocked: row.is_locked })),
    languages: (languages.data ?? []).map((row) => ({ id: row.id, name: row.name, proficiency: row.proficiency as CareerProfileV1["languages"][number]["proficiency"] })),
    preferences: {
      targetRoles: preferences.data?.target_roles ?? [],
      preferredLocations: preferences.data?.preferred_locations ?? [],
      workArrangements: (preferences.data?.work_arrangements ?? []) as CareerProfileV1["preferences"]["workArrangements"],
      salaryMin: preferences.data?.salary_min ?? null,
      salaryCurrency: preferences.data?.salary_currency ?? null,
      workAuthorizationStatus: preferences.data?.work_authorization_status ?? "",
      requiresSponsorship: preferences.data?.requires_sponsorship ?? null,
    },
  };
  return { ...careerProfileV1Schema.parse(base), email };
}

function mapBullet(row: ProfileBulletRow) {
  return {
    id: row.id,
    originalText: row.original_text,
    approvedText: row.approved_text,
    technologies: row.technologies,
    demonstratedSkills: row.demonstrated_skills,
    metrics: textArray(row.metrics),
    sourceKind: row.source_kind,
    verificationStatus: row.verification_status,
    confidence: row.confidence,
    isLocked: row.is_locked,
  };
}

export function serializeCareerProfile(profile: CareerProfileV1): Json {
  const bullets = [
    ...profile.experiences.flatMap((item) => item.bullets.map((bullet, position) => ({ ...toBullet(bullet), experience_id: item.id, project_id: null, position }))),
    ...profile.projects.flatMap((item) => item.bullets.map((bullet, position) => ({ ...toBullet(bullet), experience_id: null, project_id: item.id, position }))),
  ];
  return {
    full_name: profile.fullName,
    headline: profile.headline,
    phone: profile.phone,
    location: profile.location,
    summary: profile.summary,
    additional_info: profile.additionalInfo,
    career_stage: profile.careerStage,
    preferences: {
      target_roles: profile.preferences.targetRoles,
      preferred_locations: profile.preferences.preferredLocations,
      work_arrangements: profile.preferences.workArrangements,
      salary_min: profile.preferences.salaryMin,
      salary_currency: profile.preferences.salaryCurrency,
      work_authorization_status: profile.preferences.workAuthorizationStatus,
      requires_sponsorship: profile.preferences.requiresSponsorship,
    },
    links: profile.links.map((item, position) => ({ id: item.id, kind: item.kind, label: item.label, url: item.url, position })),
    experiences: profile.experiences.map((item, position) => ({ id: item.id, kind: item.kind, job_title: item.jobTitle, company: item.company, location: item.location, start_date: item.startDate, end_date: item.endDate, is_current: item.isCurrent, original_text: item.originalText, approved_text: item.approvedText, technologies: item.technologies, demonstrated_skills: item.demonstratedSkills, metrics: item.metrics, source_kind: item.sourceKind, verification_status: item.verificationStatus, confidence: item.confidence, is_locked: item.isLocked, position })),
    education: profile.education.map((item, position) => ({ id: item.id, school: item.school, degree: item.degree, field: item.field, location: item.location, start_date: item.startDate, end_date: item.endDate, is_current: item.isCurrent, details: item.details, position })),
    projects: profile.projects.map((item, position) => ({ id: item.id, title: item.title, date: item.date, url: item.url, original_text: item.originalText, approved_text: item.approvedText, technologies: item.technologies, demonstrated_skills: item.demonstratedSkills, metrics: item.metrics, source_kind: item.sourceKind, verification_status: item.verificationStatus, confidence: item.confidence, is_locked: item.isLocked, position })),
    skills: profile.skills.map((item, position) => ({ id: item.id, name: item.name, position })),
    achievements: profile.achievements.map((item, position) => ({ id: item.id, kind: item.kind, title: item.title, description: item.description, date: item.date, position })),
    certifications: profile.certifications.map((item, position) => ({ id: item.id, name: item.name, issuer: item.issuer, issued_on: item.issuedOn, expires_on: item.expiresOn, credential_id: item.credentialId, credential_url: item.credentialUrl, source_kind: item.sourceKind, verification_status: item.verificationStatus, confidence: item.confidence, is_locked: item.isLocked, position })),
    publications: profile.publications.map((item, position) => ({ id: item.id, title: item.title, publisher: item.publisher, published_on: item.publishedOn, url: item.url, description: item.description, source_kind: item.sourceKind, verification_status: item.verificationStatus, confidence: item.confidence, is_locked: item.isLocked, position })),
    languages: profile.languages.map((item, position) => ({ id: item.id, name: item.name, proficiency: item.proficiency, position })),
    bullets,
  };
}

function toBullet(bullet: CareerProfileV1["experiences"][number]["bullets"][number]) {
  return { id: bullet.id, original_text: bullet.originalText, approved_text: bullet.approvedText, technologies: bullet.technologies, demonstrated_skills: bullet.demonstratedSkills, metrics: bullet.metrics, source_kind: bullet.sourceKind, verification_status: bullet.verificationStatus, confidence: bullet.confidence, is_locked: bullet.isLocked };
}

export async function saveCanonicalCareerProfile(input: CareerProfileV1) {
  const profile = careerProfileV1Schema.parse(input);
  const { supabase } = await authContext();
  const { data, error } = await supabase.rpc("save_career_profile", {
    p_payload: serializeCareerProfile(profile),
    p_expected_revision: profile.revision,
  });
  if (error) throw error;
  return data;
}
