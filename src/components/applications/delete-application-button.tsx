"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteApplicationAction } from "@/app/(app)/applications/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type DeleteApplicationButtonProps = {
  applicationId: string;
  jobTitle: string;
  companyName: string;
  onDeleted: (id: string) => void;
};

/**
 * Outlook-style trash control for a mailbox row. Confirms first because the
 * delete is permanent and cascades to the application's saved resume versions,
 * cover letters, and uploaded files.
 */
export function DeleteApplicationButton({
  applicationId,
  jobTitle,
  companyName,
  onDeleted,
}: DeleteApplicationButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteApplicationAction({ applicationId });
      if (result.ok) {
        setOpen(false);
        toast.success("Application deleted");
        onDeleted(applicationId);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${jobTitle} application`}
          onClick={(event) => event.stopPropagation()}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 aria-hidden className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        onClick={(event) => event.stopPropagation()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this application?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes <strong>{jobTitle}</strong> at{" "}
            <strong>{companyName}</strong>, along with its saved resume versions
            and cover letters. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
