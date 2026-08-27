export const MSG = {
  SAVE_APPLICATION: 'SAVE_APPLICATION',
  UPDATE_APPLICATION: 'UPDATE_APPLICATION',
  DELETE_APPLICATION: 'DELETE_APPLICATION',
  GET_INDEX: 'GET_INDEX',
  GET_ALL: 'GET_ALL',
  GET_APPLICATION: 'GET_APPLICATION',
  SCRAPE_PAGE: 'SCRAPE_PAGE',
  PAGE_DETECTED: 'PAGE_DETECTED',
  REPAIR_INDEX: 'REPAIR_INDEX',
  EXPORT_JSON: 'EXPORT_JSON',
  IMPORT_JSON: 'IMPORT_JSON',
  WIPE_ALL: 'WIPE_ALL',
  // Auth / session (Phase 1 plumbing; real Supabase session lands in Phase 2)
  GET_SESSION: 'GET_SESSION',
  SET_SESSION: 'SET_SESSION',
  SIGN_OUT: 'SIGN_OUT',
  WEB_SESSION: 'WEB_SESSION', // pushed from the web app via the auth-bridge content script
};

export function send(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, ...payload });
}
