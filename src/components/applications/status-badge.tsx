import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/applications/types";
import { statusLabels } from "@/lib/applications/status";

type StatusBadgeProps = {
  status: ApplicationStatus;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant="secondary" className={cn("text-xs font-medium", className)}>
      {statusLabels[status]}
    </Badge>
  );
}
