import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ApplicationStatus } from "@/lib/applications/types";

type DashboardWidgetsProps = {
  total: number;
  active: number;
  byStatus: Record<ApplicationStatus, number>;
};

export function DashboardWidgets({
  total,
  active,
  byStatus,
}: DashboardWidgetsProps) {
  return (
    <aside className="grid w-full shrink-0 gap-4 xl:w-80">
      <WidgetCard
        label="Quick win"
        title={total === 0 ? "Add your first role" : "Log a new application"}
        description={
          total === 0
            ? "Start building your pipeline in under a minute."
            : "Keep momentum by capturing the next role you find."
        }
        action={{ label: "Add application", href: "/applications/new" }}
      />

      <WidgetCard
        label="In progress"
        title={`${active} active ${active === 1 ? "role" : "roles"}`}
        description="Applied or interviewing — these need your attention next."
        action={{ label: "View pipeline", href: "/applications" }}
        variant="primary"
      />

      <WidgetCard
        label="Pipeline"
        title={`${byStatus.interviewing} in interviews`}
        description={`${byStatus.applied} applied · ${byStatus.offer} offers · ${byStatus.rejected} closed`}
        action={{ label: "Filter by status", href: "/applications" }}
      />

      <WidgetCard
        label="Materials"
        title="Documents per role"
        description="Attach resumes and cover letters from each application detail page."
        action={{ label: "Open applications", href: "/applications" }}
      />
    </aside>
  );
}

type WidgetCardProps = {
  label: string;
  title: string;
  description: string;
  action: { label: string; href: string };
  variant?: "default" | "primary";
};

function WidgetCard({
  label,
  title,
  description,
  action,
  variant = "default",
}: WidgetCardProps) {
  return (
    <Card className={variant === "primary" ? "border-foreground/20" : undefined}>
      <CardHeader className="space-y-3 pb-2">
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <CardTitle className="text-base leading-snug">{title}</CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href={action.href}
          className={buttonVariants({
            variant: variant === "primary" ? "default" : "outline",
            size: "sm",
            className: "w-full",
          })}
        >
          {action.label}
        </Link>
      </CardContent>
    </Card>
  );
}
