import type { Metadata } from "next";
import { DocumentLibrary } from "@/components/documents/document-library";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { getDocumentLibraryData } from "@/lib/documents/repository";

export const metadata: Metadata = { title: "Resumes" };

export default async function ResumesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [data, params] = await Promise.all([getDocumentLibraryData(), searchParams]);
  return <AppPage><AppPageHeader title="Resumes" description="Keep a reusable master and the versions you tailor for specific applications." /><DocumentLibrary mode="resumes" masterResumes={data.masterResumes} resumeVersions={data.resumeVersions} initialTab={params.tab === "tailored" ? "tailored" : "master"} /></AppPage>;
}
