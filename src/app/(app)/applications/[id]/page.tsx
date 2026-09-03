import { redirect } from "next/navigation";

import { parseMailboxView } from "@/components/applications/application-mailbox-constants";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getApplicationById } from "@/lib/applications/repository";

type ApplicationDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
};

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: ApplicationDetailPageProps) {
  await requireCurrentUser();
  const { id } = await params;
  const application = await getApplicationById(id);

  if (!application) {
    redirect("/applications");
  }

  const query = await searchParams;
  const view = parseMailboxView(query.view);
  const viewParam = view === "overview" ? "" : `&view=${view}`;

  redirect(`/applications?id=${id}${viewParam}`);
}
