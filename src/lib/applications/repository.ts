import { mockApplications } from "@/lib/applications/mock-data";
import {
  applicationStatuses,
  type ApplicationFilters,
  type ApplicationStatus,
  type JobApplication,
} from "@/lib/applications/types";

function forUser(application: JobApplication, userId: string): JobApplication {
  return {
    ...application,
    userId,
    documents: application.documents.map((document) => ({
      ...document,
      storagePath: document.storagePath.replace("/preview-user/", `/${userId}/`),
    })),
    statusHistory: application.statusHistory.map((item) => ({
      ...item,
      userId,
    })),
  };
}

export async function getApplications(
  userId: string,
  filters: ApplicationFilters = {},
) {
  const query = filters.query?.trim().toLowerCase();
  const status = filters.status === "all" ? undefined : filters.status;

  return mockApplications
    .map((application) => forUser(application, userId))
    .filter((application) => {
      const matchesQuery = query
        ? `${application.companyName} ${application.jobTitle}`
            .toLowerCase()
            .includes(query)
        : true;
      const matchesStatus = status ? application.status === status : true;

      return matchesQuery && matchesStatus;
    })
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
}

export async function getApplicationById(userId: string, id: string) {
  const application = mockApplications.find((item) => item.id === id);

  return application ? forUser(application, userId) : null;
}

export async function getApplicationStats(userId: string) {
  const applications = await getApplications(userId);
  const byStatus = Object.fromEntries(
    applicationStatuses.map((status) => [status, 0]),
  ) as Record<ApplicationStatus, number>;

  for (const application of applications) {
    byStatus[application.status] += 1;
  }

  return {
    total: applications.length,
    byStatus,
    recent: applications.slice(0, 4),
    active: byStatus.applied + byStatus.interviewing,
  };
}

export function placeholderRedirectParam(value: string) {
  return `placeholder=${encodeURIComponent(value)}`;
}
