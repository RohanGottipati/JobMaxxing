import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isPreviewAuthEnabled } from "@/lib/supabase/config";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; check?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const previewEnabled = isPreviewAuthEnabled();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Log in</CardTitle>
          <CardDescription>
            Use Supabase magic links when auth is configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Sign-in failed. Please try again.
            </p>
          ) : null}
          {params.check ? (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Check your email for a magic link to sign in.
            </p>
          ) : null}

          <LoginForm />

          {previewEnabled ? (
            <Link href="/dashboard" className={buttonVariants({ className: "w-full" })}>
              Continue in preview
              <ArrowRight className="size-4" />
            </Link>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="underline underline-offset-4">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
