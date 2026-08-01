import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <AuthShell title="Create your account" description="Build a more organized job search in a few minutes." footer={<>Already have an account? <Link href="/login" className="font-medium text-foreground underline underline-offset-4">Log in</Link></>}><LoginForm mode="signup" /></AuthShell>;
}
