import type { Metadata } from "next";

import { DocumentationBrowser } from "@/components/documentation/documentation-browser";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { documentationArticles } from "@/lib/documentation/content";

export const metadata: Metadata = { title: "Documentation" };

export default function DocumentationPage() {
  return <AppPage><AppPageHeader title="Documentation" description="Practical guidance for building your profile, running the pipeline, and preserving every application document." /><DocumentationBrowser articles={documentationArticles} /></AppPage>;
}
