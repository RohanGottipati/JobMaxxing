// config.app.js — non-secret app config (safe to commit).
//
// The extension has no build step, so config is a plain ES module that other
// files import. Secrets (Supabase URL / anon key) live in the gitignored
// config.local.js. Non-secret constants that the whole team shares live here.

// Origin of the JobMaxxing web app (landing + login front door). The popup's
// "Log in with JobMaxxing" button opens `${WEB_APP_ORIGIN}/login`, and the
// auth-bridge content script only runs on this origin.
//
// Change this to your deployed domain in production (and add it to
// manifest.json host_permissions + content_scripts matches).
export const WEB_APP_ORIGIN = 'http://localhost:3000';
