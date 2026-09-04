import type { Metadata } from "next";
import { DocumentLibrary } from "@/components/documents/document-library";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { getDocumentLibraryData } from "@/lib/documents/repository";

export const metadata: Metadata = { title: "Cover letters" };

export default async function CoverLettersPage() {
  const data = await getDocumentLibraryData();
  return <AppPage><AppPageHeader title="Cover letters" description="Draft, find and preserve the letter tied to each application." /><DocumentLibrary mode="cover_letters" coverLetters={data.coverLetters} /></AppPage>;
}
