import type { ResumeTemplateId } from "@/lib/resumes/schema";

export type ResumeTemplateDefinition = {
  id: ResumeTemplateId;
  name: string;
  description: string;
  columns: 1 | 2;
  fontFamily: "sans" | "serif";
  accent: "none" | "rule" | "subtle";
  density: "compact" | "standard" | "relaxed";
  recommendedPages: 1 | 2;
};

export const RESUME_TEMPLATES: readonly ResumeTemplateDefinition[] = [
  { id: "technical-classic", name: "Technical Classic", description: "Dense, direct, and optimized for technical experience.", columns: 1, fontFamily: "serif", accent: "rule", density: "compact", recommendedPages: 1 },
  { id: "academic-standard", name: "Academic Standard", description: "Traditional hierarchy for education, research, and publications.", columns: 1, fontFamily: "serif", accent: "none", density: "standard", recommendedPages: 2 },
  { id: "engineering-standard", name: "Engineering Standard", description: "Clear technical sections with restrained visual structure.", columns: 1, fontFamily: "sans", accent: "rule", density: "standard", recommendedPages: 1 },
  { id: "campus-clean", name: "Campus Clean", description: "Balanced whitespace for students and early-career candidates.", columns: 1, fontFamily: "serif", accent: "subtle", density: "standard", recommendedPages: 1 },
  { id: "compact-sidebar", name: "Compact Sidebar", description: "A deterministic two-column reading order for compact profiles.", columns: 2, fontFamily: "sans", accent: "subtle", density: "compact", recommendedPages: 1 },
  { id: "minimal-modern", name: "Minimal Modern", description: "A quiet sans-serif layout with generous visual clarity.", columns: 1, fontFamily: "sans", accent: "none", density: "relaxed", recommendedPages: 1 },
  { id: "compact-one-page", name: "Compact One-Page", description: "Tighter typography and spacing for a focused single page.", columns: 1, fontFamily: "sans", accent: "rule", density: "compact", recommendedPages: 1 },
  { id: "professional-two-page", name: "Professional Two-Page", description: "Comfortable spacing for experienced candidates with depth.", columns: 1, fontFamily: "serif", accent: "subtle", density: "relaxed", recommendedPages: 2 },
] as const;

export function getResumeTemplate(id: ResumeTemplateId) {
  return RESUME_TEMPLATES.find((template) => template.id === id) ?? RESUME_TEMPLATES[0];
}

