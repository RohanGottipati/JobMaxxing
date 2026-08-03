import type { Metadata } from "next";

import { MaxwellPanel } from "@/components/maxwell/maxwell-panel";
import { requireCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: "Maxwell",
  description: "Chat with Maxwell about your JobMaxxing workspace.",
};

function safeContextPath(value: string | undefined) {
  if (!value || value.length > 500 || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/maxwell")) {
    return null;
  }
  return value;
}

function safeThreadId(value: string | undefined) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

export default async function MaxwellPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; thread?: string }>;
}) {
  const [user, params] = await Promise.all([requireCurrentUser(), searchParams]);

  return (
    <MaxwellPanel
      userId={user.id}
      initialContextPath={safeContextPath(params.from)}
      initialThreadId={safeThreadId(params.thread)}
    />
  );
}
