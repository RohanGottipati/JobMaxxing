// Auth bridge — content script that runs ONLY on the JobMaxxing web app origin
// (see manifest.json content_scripts + config.app.js WEB_APP_ORIGIN).
//
// After the user logs in on the website, the web app posts its Supabase session
// to the page via window.postMessage. This bridge relays that session to the
// extension's background service worker, which stores it (see src/auth.js). That
// is how "Log in with JobMaxxing" hands auth back to the extension.
//
// Content scripts can't be ES modules (MV3), so the message-type strings are
// inlined here — they must match the values in src/messages.js
// (WEB_SESSION / SIGN_OUT).

window.addEventListener('message', (event) => {
  // Only trust messages from this same page (not iframes / other origins).
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== 'jobmaxxing-auth') return;

  if (data.type === 'signout') {
    chrome.runtime.sendMessage({ type: 'SIGN_OUT' });
  } else {
    // TODO(phase-2): data.session will be the real Supabase session object.
    chrome.runtime.sendMessage({ type: 'WEB_SESSION', session: data.session });
  }
});
