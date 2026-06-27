import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Briefcase, FileText, ListFilter } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function HomePage() {
  const user = await getCurrentUser({ allowPreview: true });

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <section className="max-w-2xl space-y-6">
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">
            Job application tracker
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Track every application without losing the details.
          </h1>
          <p className="text-lg text-muted-foreground">
            Keep roles, statuses, notes, and application materials organized
            while Supabase persistence is being finalized.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className={buttonVariants()}>
            Sign up
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline" })}
          >
            Log in
          </Link>
        </div>
      </section>

      <section className="grid gap-4">
        <Card>
          <CardHeader>
            <Briefcase className="mb-2 size-5 text-muted-foreground" />
            <CardTitle className="text-base">Applications</CardTitle>
            <CardDescription>
              Search and filter every tracked role by company, title, or status.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <ListFilter className="mb-2 size-5 text-muted-foreground" />
            <CardTitle className="text-base">Status history</CardTitle>
            <CardDescription>
              Preview the status timeline that will map to the future
              status_history table.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <FileText className="mb-2 size-5 text-muted-foreground" />
            <CardTitle className="text-base">Materials</CardTitle>
            <CardDescription>
              Upload surfaces are ready for resumes, cover letters, and other
              documents.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </main>
  );
}
