import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return <AuthShell title="Reset your password" description="Enter your email and we’ll send a secure recovery link." footer={<Link href="/login" className="font-medium text-foreground underline underline-offset-4">Back to login</Link>}><PasswordRecoveryForm mode="request" /></AuthShell>;
}
