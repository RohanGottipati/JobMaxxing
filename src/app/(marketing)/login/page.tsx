import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { PageShell } from "@/components/layout/page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    <PageShell size="narrow" className="items-center justify-center py-16">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Log in</CardTitle>
          <CardDescription>
            Use Supabase magic links when auth is configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                Sign-in failed. Please try again.
              </AlertDescription>
            </Alert>
          ) : null}
          {params.check ? (
            <Alert>
              <AlertDescription>
                Check your email for a magic link to sign in.
              </AlertDescription>
            </Alert>
          ) : null}

          <LoginForm />

          {previewEnabled ? (
            <Link
              href="/dashboard"
              className={buttonVariants({ className: "w-full" })}
            >
              Continue in preview
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
    </PageShell>
  );
}
