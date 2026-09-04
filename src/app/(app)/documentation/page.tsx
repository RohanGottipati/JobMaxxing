import type { Metadata } from "next";

import { DocumentationBrowser } from "@/components/documentation/documentation-browser";
import { AppPage, AppPageHeader } from "@/components/layout/app-page";
import { documentationArticles } from "@/lib/documentation/content";

export const metadata: Metadata = { title: "Documentation" };

export default function DocumentationPage() {
  return <AppPage><AppPageHeader title="Help" description="Short guides for applications, documents, the extension and AI features." /><DocumentationBrowser articles={documentationArticles} /></AppPage>;
}
