// Auth/session store for the extension.
//
// Phase 1 (frontend merge): this is just a persistent box for a "session" object,
// backed by chrome.storage.local. It does NOT talk to Supabase yet — it stores
// whatever session it's handed (from the popup form or the web auth-bridge) and
// reports whether one exists. The popup and dashboard gate their UI on this.
//
// Phase 2 (pending env + Supabase MCP): `signInWithPassword` gets wired to
// `supabase.auth.signInWithPassword`, and the stored session becomes a real
// Supabase session whose access token is used as the PostgREST Bearer.
//
// Importable from any extension context (service worker, popup, options) —
// chrome.storage.local is available in all of them.

const SESSION_KEY = 'jm_session';

// Returns the stored session object, or null when logged out.
export async function getSession() {
  const stored = await chrome.storage.local.get(SESSION_KEY);
  return stored[SESSION_KEY] || null;
}

// Persist a session object (shape is whatever the caller provides; Phase 2 will
// standardize it to a Supabase session with access_token / user / expires_at).
export async function setSession(session) {
  await chrome.storage.local.set({ [SESSION_KEY]: session });
  return session;
}

export async function clearSession() {
  await chrome.storage.local.remove(SESSION_KEY);
}

export async function isLoggedIn() {
  return Boolean(await getSession());
}

// TODO(phase-2): wire to Supabase — `createClient(url, anon).auth.signInWithPassword(...)`
// then `setSession(data.session)`. For now this is a stub so the popup's email/password
// form has something to call and can show a clear "not enabled yet" message.
export async function signInWithPassword(/* email, password */) {
  return {
    ok: false,
    error: 'Email/password sign-in is not enabled yet (Phase 2 — pending Supabase config). Use "Log in with JobMaxxing" for now.',
  };
}
