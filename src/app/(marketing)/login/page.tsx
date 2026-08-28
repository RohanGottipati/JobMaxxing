import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const params = await searchParams;
  return <AuthShell title="Welcome back" description="Log in to pick up exactly where you left off." footer={<>New to JobMaxxing? <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">Create an account</Link></>}>
    {params.error ? <Alert variant="destructive"><AlertDescription>Your sign-in link was invalid or expired. Try again.</AlertDescription></Alert> : null}
    <LoginForm providers={{ google: process.env.AUTH_GOOGLE_ENABLED === "true", github: process.env.AUTH_GITHUB_ENABLED === "true" }} />
    <div className="text-right"><Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot your password?</Link></div>
  </AuthShell>;
}
