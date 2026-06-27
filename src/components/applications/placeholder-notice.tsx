import { BadgeCheck, Database, FileUp, Pencil, Trash2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const placeholderCopy: Record<
  string,
  { title: string; description: string; icon: typeof BadgeCheck }
> = {
  created: {
    title: "Application create flow is wired",
    description:
      "This is a placeholder redirect. Supabase persistence will replace the mock repository next.",
    icon: BadgeCheck,
  },
  updated: {
    title: "Application edit flow is wired",
    description:
      "The edit form validated successfully. Saved changes will persist after the database adapter is connected.",
    icon: Pencil,
  },
  deleted: {
    title: "Delete flow is wired",
    description:
      "Deletion is intentionally non-destructive until application persistence is finalized.",
    icon: Trash2,
  },
  uploaded: {
    title: "Upload flow is wired",
    description:
      "Document upload UI is ready. Files will use the application-documents bucket once storage policies are added.",
    icon: FileUp,
  },
};

type PlaceholderNoticeProps = {
  value?: string;
};

export function PlaceholderNotice({ value }: PlaceholderNoticeProps) {
  if (!value || !placeholderCopy[value]) {
    return null;
  }

  const copy = placeholderCopy[value];
  const Icon = copy.icon;

  return (
    <Card className="border-dashed bg-muted/30">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background ring-1 ring-border">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div>
          <CardTitle className="text-base">{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
        <Database className="size-3.5" />
        Supabase database and storage specifics are still placeholders.
      </CardContent>
    </Card>
  );
}
