// Popup UI for setting the frontend URL that background.js redirects back to
// once it's captured a full set of zotgpt auth cookies. Stored in
// chrome.storage.local under FRONTEND_URL_STORAGE_KEY (shared with
// background.js) so it persists across browser restarts and survives the
// service worker being unloaded/reloaded.

const STORAGE_KEY = "frontendUrl";
const DEFAULT_FRONTEND_URL = "http://localhost:5173";

const input = document.getElementById("frontend-url");
const status = document.getElementById("status");

chrome.storage.local.get(STORAGE_KEY, (result) => {
  input.value = result[STORAGE_KEY] || DEFAULT_FRONTEND_URL;
});

document.getElementById("save").addEventListener("click", () => {
  const value = input.value.trim().replace(/\/+$/, "") || DEFAULT_FRONTEND_URL;
  chrome.storage.local.set({ [STORAGE_KEY]: value }, () => {
    input.value = value;
    status.textContent = "Saved - used on next redirect.";
    setTimeout(() => (status.textContent = ""), 1500);
  });
});
