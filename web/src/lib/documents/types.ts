import type {
  CoverLetter,
  Resume,
  ResumeVersion,
} from "@/lib/applications/package-types";
import type { DocumentContentFormat, Json } from "@/types/database";

export type DocumentKind =
  | "master_resume"
  | "resume_version"
  | "cover_letter";

export type ApplicationOption = {
  id: string;
  companyName: string;
  jobTitle: string;
};

export type MasterResumeItem = Resume;

export type TailoredResumeItem = ResumeVersion & {
  application: ApplicationOption | null;
  baseResumeName: string | null;
};

export type CoverLetterItem = CoverLetter & {
  application: ApplicationOption | null;
};

export type DocumentLibraryData = {
  masterResumes: MasterResumeItem[];
  resumeVersions: TailoredResumeItem[];
  coverLetters: CoverLetterItem[];
  applications: ApplicationOption[];
};

export type DocumentEditorModel = {
  id: string;
  kind: DocumentKind;
  title: string;
  content: string;
  contentFormat: DocumentContentFormat;
  generationMetadata: Json;
  filePath: string | null;
  isSubmitted: boolean;
  versionNumber: number | null;
  application: ApplicationOption | null;
  baseResumeId: string | null;
  updatedAt: string;
};
