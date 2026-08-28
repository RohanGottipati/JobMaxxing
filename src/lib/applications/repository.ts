import {
  getApplicationPackage,
  getApplications as listApplications,
} from "@/lib/applications/packages";
import type { Application } from "@/lib/applications/package-types";
import {
  type ApplicationFilters,
  type JobApplication,
} from "@/lib/applications/types";

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
    | "position"
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
    position: row.position,
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
