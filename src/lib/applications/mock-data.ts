import type { JobApplication } from "@/lib/applications/types";

const userId = "preview-user";

export const mockApplications: JobApplication[] = [
  {
    id: "atlas-product-manager",
    userId,
    companyName: "Atlas Systems",
    jobTitle: "Associate Product Manager",
    jobUrl: "https://example.com/jobs/atlas-apm",
    location: "New York, NY",
    appliedAt: "2026-06-20",
    status: "interviewing",
    jobDescription:
      "Own onboarding improvements for a workflow product used by operations teams.",
    notes:
      "Recruiter screen went well. Prep metrics stories and one product critique before the panel.",
    createdAt: "2026-06-18T14:35:00.000Z",
    updatedAt: "2026-06-24T18:15:00.000Z",
    documents: [
      {
        id: "doc-atlas-resume",
        applicationId: "atlas-product-manager",
        type: "resume",
        filename: "resume-atlas-product.pdf",
        uploadedAt: "2026-06-20T15:05:00.000Z",
        sizeLabel: "184 KB",
        storagePath:
          "/preview-user/atlas-product-manager/resume-atlas-product.pdf",
      },
      {
        id: "doc-atlas-cover",
        applicationId: "atlas-product-manager",
        type: "cover_letter",
        filename: "cover-letter-atlas.pdf",
        uploadedAt: "2026-06-20T15:08:00.000Z",
        sizeLabel: "96 KB",
        storagePath:
          "/preview-user/atlas-product-manager/cover-letter-atlas.pdf",
      },
    ],
    statusHistory: [
      {
        id: "history-atlas-saved",
        applicationId: "atlas-product-manager",
        userId,
        status: "saved",
        createdAt: "2026-06-18T14:35:00.000Z",
      },
      {
        id: "history-atlas-applied",
        applicationId: "atlas-product-manager",
        userId,
        status: "applied",
        createdAt: "2026-06-20T15:05:00.000Z",
      },
      {
        id: "history-atlas-interviewing",
        applicationId: "atlas-product-manager",
        userId,
        status: "interviewing",
        createdAt: "2026-06-24T18:15:00.000Z",
      },
    ],
  },
  {
    id: "brightline-frontend",
    userId,
    companyName: "Brightline Labs",
    jobTitle: "Frontend Engineer",
    jobUrl: "https://example.com/jobs/brightline-frontend",
    location: "Remote",
    appliedAt: "2026-06-22",
    status: "applied",
    jobDescription:
      "Build customer-facing dashboards with React, TypeScript, and design systems.",
    notes:
      "Strong match on UI systems. Follow up if there is no response by June 30.",
    createdAt: "2026-06-19T17:20:00.000Z",
    updatedAt: "2026-06-22T11:42:00.000Z",
    documents: [
      {
        id: "doc-brightline-resume",
        applicationId: "brightline-frontend",
        type: "resume",
        filename: "resume-frontend.pdf",
        uploadedAt: "2026-06-22T11:40:00.000Z",
        sizeLabel: "171 KB",
        storagePath: "/preview-user/brightline-frontend/resume-frontend.pdf",
      },
    ],
    statusHistory: [
      {
        id: "history-brightline-saved",
        applicationId: "brightline-frontend",
        userId,
        status: "saved",
        createdAt: "2026-06-19T17:20:00.000Z",
      },
      {
        id: "history-brightline-applied",
        applicationId: "brightline-frontend",
        userId,
        status: "applied",
        createdAt: "2026-06-22T11:42:00.000Z",
      },
    ],
  },
  {
    id: "northstar-ops",
    userId,
    companyName: "Northstar Analytics",
    jobTitle: "Business Operations Analyst",
    jobUrl: null,
    location: "Toronto, ON",
    appliedAt: null,
    status: "saved",
    jobDescription:
      "Analyze growth funnels, partner with revenue leadership, and improve weekly reporting.",
    notes: "Need to tailor resume around SQL, dashboards, and process work.",
    createdAt: "2026-06-25T09:10:00.000Z",
    updatedAt: "2026-06-25T09:10:00.000Z",
    documents: [],
    statusHistory: [
      {
        id: "history-northstar-saved",
        applicationId: "northstar-ops",
        userId,
        status: "saved",
        createdAt: "2026-06-25T09:10:00.000Z",
      },
    ],
  },
  {
    id: "meridian-growth",
    userId,
    companyName: "Meridian Health",
    jobTitle: "Growth Associate",
    jobUrl: "https://example.com/jobs/meridian-growth",
    location: "Boston, MA",
    appliedAt: "2026-06-12",
    status: "rejected",
    jobDescription:
      "Support lifecycle experiments, campaign analytics, and acquisition reporting.",
    notes: "Rejected after recruiter screen. Role wanted more healthcare depth.",
    createdAt: "2026-06-11T16:00:00.000Z",
    updatedAt: "2026-06-17T20:05:00.000Z",
    documents: [],
    statusHistory: [
      {
        id: "history-meridian-applied",
        applicationId: "meridian-growth",
        userId,
        status: "applied",
        createdAt: "2026-06-12T13:30:00.000Z",
      },
      {
        id: "history-meridian-rejected",
        applicationId: "meridian-growth",
        userId,
        status: "rejected",
        createdAt: "2026-06-17T20:05:00.000Z",
      },
    ],
  },
  {
    id: "cobalt-strategy",
    userId,
    companyName: "Cobalt Strategy",
    jobTitle: "Strategy Intern",
    jobUrl: "https://example.com/jobs/cobalt-strategy",
    location: "Chicago, IL",
    appliedAt: "2026-06-10",
    status: "offer",
    jobDescription:
      "Research market expansion opportunities and prepare executive-ready analysis.",
    notes: "Offer received. Compare compensation and start date before replying.",
    createdAt: "2026-06-09T12:25:00.000Z",
    updatedAt: "2026-06-26T15:30:00.000Z",
    documents: [
      {
        id: "doc-cobalt-resume",
        applicationId: "cobalt-strategy",
        type: "resume",
        filename: "resume-strategy.pdf",
        uploadedAt: "2026-06-10T10:15:00.000Z",
        sizeLabel: "166 KB",
        storagePath: "/preview-user/cobalt-strategy/resume-strategy.pdf",
      },
    ],
    statusHistory: [
      {
        id: "history-cobalt-applied",
        applicationId: "cobalt-strategy",
        userId,
        status: "applied",
        createdAt: "2026-06-10T10:20:00.000Z",
      },
      {
        id: "history-cobalt-interviewing",
        applicationId: "cobalt-strategy",
        userId,
        status: "interviewing",
        createdAt: "2026-06-14T19:45:00.000Z",
      },
      {
        id: "history-cobalt-offer",
        applicationId: "cobalt-strategy",
        userId,
        status: "offer",
        createdAt: "2026-06-26T15:30:00.000Z",
      },
    ],
  },
];
