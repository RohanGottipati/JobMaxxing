import { StatusBadge } from "@/components/applications/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { uploadDocumentPlaceholder } from "@/app/(app)/applications/actions";
import { formatDateTime } from "@/lib/applications/status";
import type { JobApplication } from "@/lib/applications/types";

export function DocumentSection({
  application,
}: {
  application: JobApplication;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Application materials</CardTitle>
        <CardDescription>
          Resume, cover letter, and supporting files for this role.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {application.documents.length ? (
          <div className="grid gap-3">
            {application.documents.map((document) => (
              <div
                key={document.id}
                className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{document.filename}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {document.sizeLabel} · Uploaded{" "}
                    {formatDateTime(document.uploadedAt)}
                  </p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {document.storagePath}
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Download
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No documents attached yet.
          </div>
        )}

        <form
          action={uploadDocumentPlaceholder}
          encType="multipart/form-data"
          className="grid gap-4 rounded-lg border p-4"
        >
          <input type="hidden" name="application_id" value={application.id} />
          <div className="grid gap-4 md:grid-cols-[180px_1fr_auto] md:items-end">
            <div className="grid gap-2">
              <Label htmlFor="document_type">Document type</Label>
              <Select id="document_type" name="document_type" defaultValue="resume">
                <option value="resume">Resume</option>
                <option value="cover_letter">Cover letter</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="document">Upload file</Label>
              <Input id="document" name="document" type="file" />
            </div>
            <Button type="submit">Upload</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Placeholder only. Final storage will use the private
            application-documents bucket.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export function StatusHistorySection({
  application,
}: {
  application: JobApplication;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Status history</CardTitle>
        <CardDescription>
          Placeholder timeline for the future status_history table.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {application.statusHistory.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-border p-3"
          >
            <StatusBadge status={item.status} />
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(item.createdAt)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
