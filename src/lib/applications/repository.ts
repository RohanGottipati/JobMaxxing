import {
  getApplicationPackage,
  getApplications as listApplications,
} from "@/lib/applications/packages";
import type { Application } from "@/lib/applications/package-types";
import {
  applicationStatuses,
  type ApplicationFilters,
  type ApplicationStatus,
  type JobApplication,
} from "@/lib/applications/types";

// Statuses that count as "in flight" for dashboard stats.
const activeStatuses: ApplicationStatus[] = [
  "applied",
  "online_assessment",
  "interview",
  "final_round",
];

function toJobApplication(
  row: Pick<
    Application,
    | "id"
    | "user_id"
    | "company_name"
    | "role_title"
    | "job_url"
    | "location"
    | "date_applied"
    | "deadline"
    | "status"
    | "job_description"
    | "notes"
    | "referral_contact"
    | "next_action"
    | "submitted_resume_version_id"
    | "submitted_cover_letter_id"
    | "created_at"
    | "updated_at"
  >,
): JobApplication {
  return {
    id: row.id,
    userId: row.user_id,
    companyName: row.company_name,
    jobTitle: row.role_title,
    jobUrl: row.job_url,
    location: row.location,
    appliedAt: row.date_applied,
    deadline: row.deadline,
    status: row.status,
    jobDescription: row.job_description,
    notes: row.notes,
    referralContact: row.referral_contact,
    nextAction: row.next_action,
    submittedResumeVersionId: row.submitted_resume_version_id,
    submittedCoverLetterId: row.submitted_cover_letter_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getApplications(filters: ApplicationFilters = {}) {
  const query = filters.query?.trim().toLowerCase();
  const status = filters.status === "all" ? undefined : filters.status;

  const rows = await listApplications();

  return rows.map(toJobApplication).filter((application) => {
    const matchesQuery = query
      ? `${application.companyName} ${application.jobTitle}`
          .toLowerCase()
          .includes(query)
      : true;
    const matchesStatus = status ? application.status === status : true;

    return matchesQuery && matchesStatus;
  });
}

export async function getApplicationById(id: string) {
  const application = await getApplicationPackage(id);

  return application ? toJobApplication(application) : null;
}

export async function getApplicationStats() {
  const applications = await getApplications();
  const byStatus = Object.fromEntries(
    applicationStatuses.map((status) => [status, 0]),
  ) as Record<ApplicationStatus, number>;

  for (const application of applications) {
    byStatus[application.status] += 1;
  }

  const active = activeStatuses.reduce(
    (total, status) => total + byStatus[status],
    0,
  );

  return {
    total: applications.length,
    byStatus,
    recent: applications.slice(0, 4),
    active,
  };
}
