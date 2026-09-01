import { API_URL } from "./config.js";
import { loadCookieState, saveCookieState, encodeCookieState, decodeCookieState, HEADER_NAME } from "./cookies.js";

// fetch() wrapper that attaches the current cookie state (if we have one yet)
// as a header, and persists whatever updated state the server hands back -
// same round trip on every call, quota/new-chat/chat alike.
export async function zotFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const state = loadCookieState();
  if (state) headers.set(HEADER_NAME, encodeCookieState(state));

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  const updated = res.headers.get(HEADER_NAME);
  if (updated) {
    try {
      saveCookieState(decodeCookieState(updated));
    } catch {
      // malformed header - ignore, next response will carry a fresh one
    }
  }

  return res;
}
