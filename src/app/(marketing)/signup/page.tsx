import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { PageShell } from "@/components/layout/page-shell";
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

export default async function SignupPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const previewEnabled = isPreviewAuthEnabled();

  return (
    <PageShell size="narrow" className="items-center justify-center py-16">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>
            Create your account with a Supabase magic link once auth is wired.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginForm mode="signup" />

          {previewEnabled ? (
            <Link
              href="/dashboard"
              className={buttonVariants({ className: "w-full" })}
            >
              Continue in preview
            </Link>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
