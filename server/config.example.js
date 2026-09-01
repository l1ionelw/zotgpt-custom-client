// Copy this file to config.local.js and fill in real values from your browser's devtools.
// config.local.js is gitignored on purpose - these cookies are your live UCI SSO session,
// don't ever commit real values.
//
// How to get these:
// 1. Log into https://chat.zotgpt.uci.edu in your normal browser.
// 2. Open devtools -> Network tab, click any request to chat.zotgpt.uci.edu.
// 3. Copy the full `cookie` request header value, or just pull out the individual
//    name=value pairs below.

module.exports = {
  // Cloudflare's own bot-check pass, NOT app auth - only present when
  // Cloudflare decided a challenge was warranted, which is conditional and
  // can lapse on its own. Often just isn't in your browser's cookies at all
  // (nothing wrong if so). Leave as "" if you don't have one; the server
  // treats it as optional and simply omits it from the outgoing Cookie
  // header when empty.
  cf_clearance: "",

  // This is the actual auth cookie - a Shibboleth (UCI SSO) session id.
  // The cookie *name* itself is a base64-ish encoding of the SP entity id, e.g.:
  //   _shibsession_64656661756c7468747470733a2f2f636861742e7a6f746770742e7563692e6564752f73686962626f6c657468
  // Keep the name exactly as your browser shows it - decoding it isn't necessary.
  shibsession_name:
    "_shibsession_64656661756c7468747470733a2f2f636861742e7a6f746770742e7563692e6564752f73686962626f6c657468",
  shibsession_value: "PASTE_SHIBSESSION_VALUE_HERE",

  // AWS ALB stickiness cookies. Not auth, but the LB seems to reissue them on
  // every response and the server may care that they're present/consistent.
  AWSALB: "PASTE_AWSALB_HERE",
  AWSALBCORS: "PASTE_AWSALBCORS_HERE",

  // Local proxy port.
  port: 8787,
};
