import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";

const features = [
  {
    title: "Applications",
    description:
      "Search and filter every tracked role by company, title, or status.",
  },
  {
    title: "Pipeline board",
    description:
      "Drag roles across stages from saved to offer — status changes save instantly.",
  },
  {
    title: "Application packages",
    description:
      "Save the exact resume version and cover letter you submitted for each role.",
  },
] as const;

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-4 py-16 lg:grid-cols-2 lg:items-start lg:gap-16">
      <section className="max-w-2xl space-y-8">
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">Job application tracker</p>
          <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">
            Track every application without losing the details.
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
            Keep roles, statuses, notes, and application materials organized in
            one focused workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className={buttonVariants({ size: "lg" })}>
            Sign up
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Log in
          </Link>
        </div>
      </section>

      <section className="grid gap-4">
        {features.map(({ title, description }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </main>
  );
}
