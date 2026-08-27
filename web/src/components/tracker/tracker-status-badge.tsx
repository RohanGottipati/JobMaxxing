import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  trackedJobStatusLabels,
  type TrackedJobStatus,
} from "@/lib/tracked-jobs/types";

/** Status palette mirroring the JobTrack extension's options dashboard. */
const statusAccents: Record<TrackedJobStatus, { badge: string; dot: string }> = {
  applied: { badge: "border-blue-200 bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  oa: { badge: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  interview: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  offer: { badge: "border-green-200 bg-green-50 text-green-700", dot: "bg-green-600" },
  rejected: { badge: "border-red-200 bg-red-50 text-red-700", dot: "bg-red-500" },
  ghosted: { badge: "border-gray-200 bg-gray-100 text-gray-600", dot: "bg-gray-400" },
};

type TrackerStatusBadgeProps = {
  status: TrackedJobStatus;
  className?: string;
};

export function TrackerStatusBadge({ status, className }: TrackerStatusBadgeProps) {
  const accent = statusAccents[status];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 text-[11px] font-medium", accent.badge, className)}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", accent.dot)} />
      {trackedJobStatusLabels[status]}
    </Badge>
  );
}
