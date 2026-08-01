import type { Metadata } from "next";
import Link from "next/link";

import { DocumentLibrary } from "@/components/documents/document-library";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { buttonVariants } from "@/components/ui/button";
import { getDocumentLibraryData } from "@/lib/documents/repository";

export const metadata: Metadata = { title: "My Cover Letters" };

export default async function CoverLettersPage() {
  const data = await getDocumentLibraryData();
  return <AppPage><AppPageHeader title="My Cover Letters" description="Find, review, and preserve every application-specific cover letter." action={<Link href="/cover-letters/new" className={buttonVariants({ size: "lg" })}>New cover letter</Link>} /><DocumentLibrary mode="cover_letters" coverLetters={data.coverLetters} /></AppPage>;
}
