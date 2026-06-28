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
    <Badge variant="outline" className={cn("text-muted-foreground", className)}>
      {statusLabels[status]}
    </Badge>
  );
}
