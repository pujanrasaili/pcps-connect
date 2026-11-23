const cors = require("cors");

// The browser asks the API "may this site call you?" (a preflight OPTIONS
// request) before almost every call, because the app sends a custom header.
// Without a max age a browser may only remember the answer for a few seconds,
// so on a slow connection to a far-away server each click paid for two round
// trips. A day (browsers cap it lower on their own) lets one answer cover
// many requests.
const PREFLIGHT_MAX_AGE_SECONDS = 86400;

const corsPolicy = () =>
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
    maxAge: PREFLIGHT_MAX_AGE_SECONDS,
  });

module.exports = { corsPolicy, PREFLIGHT_MAX_AGE_SECONDS };
