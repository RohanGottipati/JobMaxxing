import type { ApplicationStatus, JobApplication } from "@/lib/applications/types";

export function getTimeGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "GOOD MORNING";
  }

  if (hour < 17) {
    return "GOOD AFTERNOON";
  }

  return "GOOD EVENING";
}

export function getDisplayName(email?: string | null, isPreview?: boolean) {
  if (isPreview) {
    return "there";
  }

  if (!email) {
    return "there";
  }

  const local = email.split("@")[0] ?? "there";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export type PipelineStep = {
  id: string;
  number: string;
  title: string;
  description: string;
  state: "done" | "current" | "upcoming";
  action?: { label: string; href: string };
};

export function getPipelineSteps(stats: {
  total: number;
  active: number;
  byStatus: Record<ApplicationStatus, number>;
}): PipelineStep[] {
  const hasApplications = stats.total > 0;
  const hasActive = stats.active > 0;
  const hasOffer = stats.byStatus.offer > 0;

  return [
    {
      id: "pipeline",
      number: "01",
      title: "Build your pipeline",
      description: "Add roles you want to track with company, title, and status.",
      state: hasApplications ? "done" : "current",
      action: hasApplications
        ? { label: "View applications", href: "/applications" }
        : { label: "Add your first role", href: "/applications/new" },
    },
    {
      id: "active",
      number: "02",
      title: "Move applications forward",
      description:
        "Track applied and interviewing roles. Keep notes and materials in one place.",
      state: hasOffer ? "done" : hasActive ? "current" : hasApplications ? "upcoming" : "upcoming",
      action: hasActive
        ? { label: "See active roles", href: "/applications?status=applied" }
        : undefined,
    },
    {
      id: "offer",
      number: "03",
      title: "Land an offer",
      description: "Celebrate outcomes and compare compensation when offers arrive.",
      state: hasOffer ? "current" : "upcoming",
      action: hasOffer
        ? { label: "View offers", href: "/applications?status=offer" }
        : undefined,
    },
  ];
}

export function getPipelineProgress(steps: PipelineStep[]) {
  const completed = steps.filter((step) => step.state === "done").length;
  const current = steps.some((step) => step.state === "current");
  const value = completed + (current ? 0.5 : 0);
  const max = steps.length;

  return {
    completed,
    max,
    percent: Math.round((value / max) * 100),
    label: `${Math.min(completed + (current ? 1 : 0), max)} of ${max}`,
  };
}

export function getTargetCompanies(applications: JobApplication[], limit = 5) {
  const seen = new Set<string>();
  const companies: string[] = [];

  for (const application of applications) {
    if (seen.has(application.companyName)) {
      continue;
    }

    seen.add(application.companyName);
    companies.push(application.companyName);

    if (companies.length >= limit) {
      break;
    }
  }

  return companies;
}

export function companyInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
