"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Hands the logged-in Supabase session to the JobTrack browser extension.
//
// The extension's auth-bridge content script (extension/content/auth-bridge.js)
// runs on this web app's origin and listens for this same-origin postMessage,
// then relays the session to its background worker. This is what makes the
// "Log in with JobMaxxing" flow hand authentication back to the extension.
//
// Phase 1 (frontend merge): the wiring is in place but no-ops while Supabase is
// unconfigured (empty env). Phase 2: once NEXT_PUBLIC_SUPABASE_* are set, this
// automatically posts the real session on load and on every auth change.
export function ExtensionAuthBridge() {
  useEffect(() => {
    // TODO(phase-2): configure NEXT_PUBLIC_SUPABASE_* to activate the hand-off.
    if (!isSupabaseConfigured()) return;

    const post = (type: "session" | "signout", session: unknown) => {
      window.postMessage(
        { source: "jobmaxxing-auth", type, session },
        window.location.origin,
      );
    };

    let supabase;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    // Push the current session immediately on mount...
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) post("session", data.session);
    });

    // ...and on every future auth change (login, token refresh, logout).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) post("session", session);
      else post("signout", null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
