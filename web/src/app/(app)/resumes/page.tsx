import type { Metadata } from "next";
import Link from "next/link";

import { DocumentLibrary } from "@/components/documents/document-library";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { buttonVariants } from "@/components/ui/button";
import { getDocumentLibraryData } from "@/lib/documents/repository";

export const metadata: Metadata = { title: "My Resumes" };

export default async function ResumesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [data, params] = await Promise.all([getDocumentLibraryData(), searchParams]);
  return <AppPage><AppPageHeader title="My Resumes" description="Keep reusable master resumes and every application-specific version organized in one place." action={<Link href="/resumes/new" className={buttonVariants({ size: "lg" })}>New master resume</Link>} /><DocumentLibrary mode="resumes" masterResumes={data.masterResumes} resumeVersions={data.resumeVersions} initialTab={params.tab === "tailored" ? "tailored" : "master"} /></AppPage>;
}
