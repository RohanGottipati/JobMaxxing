"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className }: SignOutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();

    router.push("/");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      disabled={isLoading}
      className={cn("h-9 justify-start", className)}
    >
      {isLoading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
      {isLoading ? "Signing out..." : "Sign out"}
    </Button>
  );
}
