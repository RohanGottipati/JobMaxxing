import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const placeholderCopy: Record<string, { title: string; description: string }> = {
  created: {
    title: "Application create flow is wired",
    description:
      "This is a placeholder redirect. Supabase persistence will replace the mock repository next.",
  },
  updated: {
    title: "Application edit flow is wired",
    description:
      "The edit form validated successfully. Saved changes will persist after the database adapter is connected.",
  },
  deleted: {
    title: "Delete flow is wired",
    description:
      "Deletion is intentionally non-destructive until application persistence is finalized.",
  },
  uploaded: {
    title: "Upload flow is wired",
    description:
      "Document upload UI is ready. Files will use the application-documents bucket once storage policies are added.",
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

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        Supabase database and storage specifics are still placeholders.
      </CardContent>
    </Card>
  );
}
