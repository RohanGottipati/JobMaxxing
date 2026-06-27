"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type LoginFormProps = {
  mode?: "login" | "signup";
};

export function LoginForm({ mode = "login" }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();
  const submitLabel = mode === "signup" ? "Send signup link" : "Send magic link";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!configured) {
      setError("Supabase auth is not configured yet.");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });

    setIsLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setMessage("Check your email for a magic link.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      {!configured ? (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Supabase auth is a placeholder right now. Use preview mode to review
          the app UI.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <Button type="submit" disabled={isLoading || !configured} className="w-full">
        {isLoading ? "Sending..." : submitLabel}
      </Button>
    </form>
  );
}
