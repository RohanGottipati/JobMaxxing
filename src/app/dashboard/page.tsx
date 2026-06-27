import Link from "next/link";
import { Plus } from "lucide-react";

import { DashboardSummary } from "@/components/applications/dashboard-summary";
import { buttonVariants } from "@/components/ui/button";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getApplicationStats } from "@/lib/applications/repository";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const stats = await getApplicationStats(user.id);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {user.isPreview ? "Preview workspace" : user.email}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Track every role, status, and follow-up from one focused view.
          </p>
        </div>
        <Link href="/applications/new" className={buttonVariants()}>
          <Plus className="size-4" />
          Add application
        </Link>
      </div>

      <DashboardSummary
        total={stats.total}
        active={stats.active}
        byStatus={stats.byStatus}
        recent={stats.recent}
      />
    </main>
  );
}
