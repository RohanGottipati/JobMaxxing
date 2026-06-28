import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getApplicationStats } from "@/lib/applications/repository";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const stats = await getApplicationStats(user.id);

  return (
    <DashboardHome
      email={user.email}
      isPreview={user.isPreview}
      total={stats.total}
      active={stats.active}
      byStatus={stats.byStatus}
      recent={stats.recent}
    />
  );
}
