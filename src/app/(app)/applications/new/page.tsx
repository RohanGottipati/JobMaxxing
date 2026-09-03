import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { parseApplicationStatus } from "@/lib/applications/status";

type NewApplicationPageProps = {
  searchParams: Promise<{ error?: string; status?: string }>;
};

export default async function NewApplicationPage({
  searchParams,
}: NewApplicationPageProps) {
  await requireCurrentUser();
  const params = await searchParams;
  const next = new URLSearchParams({ compose: "new" });
  const status = parseApplicationStatus(params.status);
  if (status) next.set("status", status);
  if (params.error) next.set("error", params.error);
  redirect(`/applications?${next.toString()}`);
}
