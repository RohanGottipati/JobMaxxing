"use client";

import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type LoginFormProps = {
  mode?: "login" | "signup";
  providers?: { google: boolean; github: boolean };
};

export function LoginForm({
  mode = "login",
  providers = { google: false, github: false },
}: LoginFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  async function handleSocial(provider: "google" | "github") {
    setError(null);
    setIsLoading(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    if (oauthError) {
      setIsLoading(false);
      setError(oauthError.message);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (isSignup && password !== confirmation) {
      setError("Your passwords do not match.");
      return;
    }
    if (isSignup && !fullName.trim()) {
      setError("Enter your full name.");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    if (isSignup) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          data: { full_name: fullName.trim() },
        },
      });
      setIsLoading(false);
      if (signUpError) return setError(signUpError.message);
      if (!data.session) {
        setMessage("Account created. Check your inbox to confirm your email, then log in.");
        return;
      }
      router.push("/onboarding");
      router.refresh();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (signInError) return setError(signInError.message);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {providers.google || providers.github ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {providers.google ? (
            <Button type="button" variant="outline" disabled={isLoading} onClick={() => void handleSocial("google")}>
              <span aria-hidden className="text-sm font-semibold">G</span>
              Google
            </Button>
          ) : null}
          {providers.github ? (
            <Button type="button" variant="outline" disabled={isLoading} onClick={() => void handleSocial("github")}>
              <span aria-hidden className="text-sm font-semibold">GH</span> GitHub
            </Button>
          ) : null}
        </div>
      ) : null}
      {providers.google || providers.github ? (
        <div className="flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or continue with email</span>
          <span className="h-px flex-1 bg-border" />
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-4">
      {isSignup ? (
        <Field label="Full name" htmlFor="full-name">
          <Input id="full-name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" required />
        </Field>
      ) : null}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </Field>
      <Field label="Password" htmlFor="password">
        <div className="relative">
          <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="At least 8 characters" autoComplete={isSignup ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} className="pr-10" required />
          <Button type="button" variant="ghost" size="icon-sm" className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}</Button>
        </div>
      </Field>
      {isSignup ? (
        <Field label="Confirm password" htmlFor="confirm-password">
          <Input id="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} required />
        </Field>
      ) : null}
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      {message ? <Alert><AlertDescription>{message}</AlertDescription></Alert> : null}
      <Button type="submit" disabled={isLoading} className="h-10 w-full">
        {isLoading ? <Loader2 aria-hidden className="animate-spin" /> : null}
        {isLoading ? "Please wait..." : isSignup ? "Create account" : "Log in"}
      </Button>
      </form>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}
