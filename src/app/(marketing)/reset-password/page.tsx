import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";

export const metadata: Metadata = { title: "Choose new password" };

export default function ResetPasswordPage() {
  return <AuthShell title="Choose a new password" description="Use at least eight characters and keep it somewhere safe." footer={<Link href="/login" className="font-medium text-foreground underline underline-offset-4">Back to login</Link>}><PasswordRecoveryForm mode="reset" /></AuthShell>;
}
