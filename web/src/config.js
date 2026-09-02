// Only thing you should need to change here during dev - where the API server
// (../server, holds the actual zotgpt cookies) is listening.
//
// VITE_PRODUCTION is set via web/.env.production, which Vite only loads for
// `vite build` (mode "production") - `npm run dev` (mode "development") never
// sets it, so debug always talks to the standalone server on :8787. A
// production build is served by server.js itself (see server/server.js),
// same-origin, so it can just hit relative /api paths instead.
export const API_URL = import.meta.env.VITE_PRODUCTION ? "" : "http://localhost:8787";
