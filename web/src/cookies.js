// Client-side cookie state, mirroring server/server.js's shape:
// { cf_clearance, shibsession_name, shibsession_value, AWSALB, AWSALBCORS }
//
// This is NOT a real browser cookie for chat.zotgpt.uci.edu (a page on this
// origin can never write one - see README). It's just opaque data we hold and
// hand back to the API server on every request, the same way you'd carry a
// bearer token. The server is the one that turns it into a real `Cookie`
// header when it talks to zotgpt.

const STORAGE_KEY = "zot-cookie-state";
const HEADER_NAME = "x-zot-cookies";

export function loadCookieState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCookieState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) - not fatal, the
    // server just falls back to its own bootstrap seed on the next request.
  }
}

// Drops the stored state so the next request omits the header entirely and
// the server falls back to its own config.local.js bootstrap seed. Useful
// when the browser is holding onto stale cookies (e.g. an old, now-expired
// shibsession) that keep overriding a freshly-updated config.local.js.
export function clearCookieState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function encodeCookieState(state) {
  return btoa(JSON.stringify(state));
}

export function decodeCookieState(b64) {
  return JSON.parse(atob(b64));
}

export { HEADER_NAME };
