// API server for the reverse-engineered chat.zotgpt.uci.edu API. Acts as a
// proxy to zotgpt (a proxy is just a server whose job is forwarding requests
// to another server) - the UI lives in a separate React project (../web) and
// only ever talks to this server, never to zotgpt directly.
//
// Why this needs to exist at all instead of the browser calling zotgpt directly:
//   - `Cookie` is a forbidden header name in browser `fetch`/XHR - JS cannot set it,
//     even same-origin, even with mode:'cors'. It can only ride along automatically
//     via the browser's real cookie jar for that domain.
//   - zotgpt almost certainly doesn't send back Access-Control-Allow-Origin for
//     http://localhost:xxxx, so a direct cross-origin fetch would be blocked anyway.
//
// So this Node process is the one that actually attaches the zotgpt `Cookie`
// header and makes the server-to-server call (not subject to either restriction
// above - only requests made *from a page in a browser* are).
//
// STATE LIVES ON THE CLIENT, NOT HERE. This server holds no cookie jar between
// requests. Each request carries the current cookie state in an `x-zot-cookies`
// header (base64 JSON), and each response echoes back the possibly-updated
// state in the same header. The React app persists that to localStorage and
// resends it on the next call - the same shape as a bearer token. This works
// because the *value* of a cookie is just opaque data once it's off the wire;
// what a browser can never do is attach it as an actual `Cookie` header to a
// request going to a domain other than the page's own origin, and this design
// doesn't ask it to - the client only ever carries the value as JSON, and it's
// this server, not the browser, that turns it into a real `Cookie` header when
// calling zotgpt.
//
// config.local.js is only the *bootstrap* seed: used when a request arrives
// with no `x-zot-cookies` header at all (a browser with empty localStorage -
// first run, or after clearing storage). Every response after that carries
// forward whatever the client already had, merged with any Set-Cookie updates.

const express = require("express");
const cors = require("cors");
const https = require("https");
const { ACTION_REQUEST_NEW_CHAT } = require("./actions.json");

let config;
try {
  config = require("./config.local.js");
} catch (e) {
  console.error(
    "Missing config.local.js - copy config.example.js to config.local.js and fill in your cookies."
  );
  process.exit(1);
}

const ZOTGPT_HOST = "chat.zotgpt.uci.edu";
const COOKIE_HEADER = "x-zot-cookies";

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

// Cookie state shape, shuttled to/from the client as base64 JSON:
// { cf_clearance, shibsession_name, shibsession_value, AWSALB, AWSALBCORS }

function decodeCookieState(b64) {
  if (!b64) return null;
  try {
    return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function encodeCookieState(state) {
  return Buffer.from(JSON.stringify(state)).toString("base64");
}

function bootstrapCookieState() {
  return {
    cf_clearance: config.cf_clearance,
    shibsession_name: config.shibsession_name,
    shibsession_value: config.shibsession_value,
    AWSALB: config.AWSALB,
    AWSALBCORS: config.AWSALBCORS,
  };
}

// Pulls the cookie state the client sent, or falls back to config.local.js's
// bootstrap values if this is the client's first request.
function resolveCookieState(req) {
  return decodeCookieState(req.get(COOKIE_HEADER)) || bootstrapCookieState();
}

// cf_clearance is Cloudflare's own bot-check pass, not app auth - it's only
// present when Cloudflare decided a challenge was warranted, which is
// conditional and can lapse. Everything else here is effectively required
// (shibsession is the real auth; AWSALB/AWSALBCORS are ALB stickiness), so
// only cf_clearance is treated as optional.
function cookieStateToHeader(state) {
  const pairs = [];
  if (state.cf_clearance) pairs.push(`cf_clearance=${state.cf_clearance}`);
  if (state.shibsession_name && state.shibsession_value) {
    pairs.push(`${state.shibsession_name}=${state.shibsession_value}`);
  }
  if (state.AWSALB) pairs.push(`AWSALB=${state.AWSALB}`);
  if (state.AWSALBCORS) pairs.push(`AWSALBCORS=${state.AWSALBCORS}`);
  return pairs.join("; ");
}

// Merges `Set-Cookie` response headers into a cookie state object by name.
function mergeSetCookie(state, setCookieHeaders) {
  const next = { ...state };
  for (const raw of setCookieHeaders || []) {
    const pair = raw.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();

    if (name === "cf_clearance") next.cf_clearance = value;
    else if (name === "AWSALB") next.AWSALB = value;
    else if (name === "AWSALBCORS") next.AWSALBCORS = value;
    else if (name.startsWith("_shibsession_")) {
      next.shibsession_name = name;
      next.shibsession_value = value;
    }
  }
  return next;
}

// Makes a request to zotgpt with the given cookie state + spoofed origin/
// referer. Resolves with the upstream response and the cookie state updated
// from any Set-Cookie headers it sent back.
function zotRequest({ method, path: zotPath, body, extraHeaders, cookieState }) {
  return new Promise((resolve, reject) => {
    const headers = Object.assign(
      {
        cookie: cookieStateToHeader(cookieState),
        origin: `https://${ZOTGPT_HOST}`,
        referer: `https://${ZOTGPT_HOST}/chat`,
        accept: "*/*",
        // Required: AWS WAF's NoUserAgent_HEADER managed rule 403s any request
        // with no User-Agent at the ALB, before it ever reaches the app or
        // checks cookies. Node's https.request sends none by default.
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      },
      extraHeaders || {}
    );

    if (body) {
      if (!headers["content-type"]) headers["content-type"] = "application/json";
      headers["content-length"] = Buffer.byteLength(body);
    }

    log(`-> upstream ${method} https://${ZOTGPT_HOST}${zotPath}`);

    const req = https.request(
      { hostname: ZOTGPT_HOST, path: zotPath, method, headers },
      (res) => {
        log(
          `<- upstream ${res.statusCode} ${method} ${zotPath}`,
          `server=${res.headers.server || "?"}`,
          `content-type=${res.headers["content-type"] || "?"}`,
          `set-cookie-count=${(res.headers["set-cookie"] || []).length}`
        );
        resolve({ res, cookieState: mergeSetCookie(cookieState, res.headers["set-cookie"]) });
      }
    );

    req.on("error", (err) => {
      log(`XX upstream request error for ${method} ${zotPath}:`, err.message);
      reject(err);
    });
    if (body) req.write(body);
    req.end();
  });
}

const app = express();
app.use(cors({ exposedHeaders: [COOKIE_HEADER] }));
app.use((req, res, next) => {
  log(`>> ${req.method} ${req.originalUrl}`);
  next();
});

// GET /api/quota - proxy quota check
app.get("/api/quota", async (req, res) => {
  const cookieState = resolveCookieState(req);
  const { res: zotRes, cookieState: nextState } = await zotRequest({
    method: "GET",
    path: "/api/chat/quota",
    cookieState,
  });

  let data = "";
  zotRes.on("data", (c) => (data += c));
  zotRes.on("end", () => {
    res
      .status(zotRes.statusCode)
      .set(COOKIE_HEADER, encodeCookieState(nextState))
      .type(zotRes.headers["content-type"] || "application/json")
      .send(data);
  });
});

// GET /api/new-chat - invoke the "create chat" Next.js server action.
//
// Not a redirect (that theory was wrong - GET /chat just renders the SPA
// shell). The real UI's "New Chat" button calls a Next.js Server Action:
// a POST to /chat with a `next-action` header (a hash identifying the
// action - tied to the deployed build, may need updating if zotgpt
// redeploys) and a body of "[]" (Next's wire format for "zero arguments").
// The response is React Flight/RSC text, not plain JSON - line "0:" is a
// pointer, line "1:" is the actual created chat-thread object, which has
// the new id in it.
//
// The browser also sends a `next-router-state-tree` header (describes the
// current route) on this call, but tested and confirmed unnecessary - the
// server action runs fine with it omitted entirely, so we don't bother
// building/sending it.
//
// NOTE: every call to this creates a real, persistent chat thread server
// side (it shows up in the user's chat history) - it's not a free/no-op
// lookup, so don't spam this endpoint.
app.get("/api/new-chat", async (req, res) => {
  const cookieState = resolveCookieState(req);
  const { res: zotRes, cookieState: nextState } = await zotRequest({
    method: "POST",
    path: "/chat",
    body: "[]",
    cookieState,
    extraHeaders: {
      accept: "text/x-component",
      "content-type": "text/plain;charset=UTF-8",
      "next-action": ACTION_REQUEST_NEW_CHAT,
    },
  });

  res.set(COOKIE_HEADER, encodeCookieState(nextState));

  let data = "";
  zotRes.on("data", (c) => (data += c));
  zotRes.on("end", () => {
    if (zotRes.statusCode !== 200) {
      log(`XX /api/new-chat: upstream returned ${zotRes.statusCode}:`, data.slice(0, 500));
      res.status(502).json({
        error: "Server action call failed.",
        status: zotRes.statusCode,
        body: data.slice(0, 2000),
      });
      return;
    }

    // Response is RSC "N:<json-ish>" lines, not plain JSON. Chunk "1" holds
    // the created chat thread. Pull its id out with a regex rather than
    // trying to fully parse Flight's non-standard $-prefixed value syntax.
    const match = data.match(/^1:\{"id":"([A-Za-z0-9_-]+)"/m);
    if (!match) {
      log("XX /api/new-chat: couldn't find id in response:", data.slice(0, 500));
      res.status(502).json({
        error: "Got a 200 but couldn't find an id in the response body.",
        body: data.slice(0, 2000),
      });
      return;
    }

    const id = match[1];
    log(`OK /api/new-chat -> id=${id}`);
    res.json({ id, location: `/chat/${id}` });
  });
});

// POST /api/chat - proxy the streaming chat request. Body forwarded verbatim
// as raw text (not re-encoded through express.json()) since we don't need to
// touch it, just relay it upstream.
app.post("/api/chat", express.text({ type: "*/*" }), async (req, res) => {
  const cookieState = resolveCookieState(req);
  const { res: zotRes, cookieState: nextState } = await zotRequest({
    method: "POST",
    path: "/api/chat",
    body: req.body,
    cookieState,
    extraHeaders: { "content-type": "application/json" },
  });

  res.status(zotRes.statusCode);
  res.set({
    [COOKIE_HEADER]: encodeCookieState(nextState),
    "content-type": zotRes.headers["content-type"] || "text/event-stream",
    "cache-control": "no-cache",
  });

  zotRes.on("data", (chunk) => res.write(chunk));
  zotRes.on("end", () => res.end());
  zotRes.on("error", () => res.end());
});

app.use((req, res) => {
  res.status(404).json({ error: "not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: String(err) });
});

app.listen(config.port, () => {
  console.log(`zotgpt API server running at http://localhost:${config.port}`);
});
