import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/applications/types";
import { statusAccents, statusLabels } from "@/lib/applications/status";

type StatusBadgeProps = {
  status: ApplicationStatus;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 text-[11px] font-medium", statusAccents[status].badge, className)}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", statusAccents[status].dot)} />
      {statusLabels[status]}
    </Badge>
  );
}
