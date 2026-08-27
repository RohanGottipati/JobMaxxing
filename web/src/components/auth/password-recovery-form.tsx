"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function PasswordRecoveryForm({ mode }: { mode: "request" | "reset" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (mode === "reset" && password !== confirmation) return setError("Your passwords do not match.");
    setPending(true);
    const supabase = createClient();
    if (mode === "request") {
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
      setPending(false);
      if (requestError) return setError(requestError.message);
      setMessage("If an account exists for that email, a reset link is on its way.");
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) return setError(updateError.message);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "request" ? <div className="grid gap-1.5"><Label htmlFor="recovery-email">Email</Label><Input id="recovery-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div> : <><div className="grid gap-1.5"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></div><div className="grid gap-1.5"><Label htmlFor="confirm-new-password">Confirm password</Label><Input id="confirm-new-password" type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div></>}
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      {message ? <Alert><AlertDescription>{message}</AlertDescription></Alert> : null}
      <Button type="submit" className="h-10 w-full" disabled={pending}>{pending ? <Loader2 aria-hidden className="animate-spin" /> : null}{pending ? "Please wait..." : mode === "request" ? "Send reset link" : "Update password"}</Button>
    </form>
  );
}
