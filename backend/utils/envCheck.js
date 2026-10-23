// Start-up sanity check of the environment variables the server depends on.
// Pure (takes env as an argument) so it can be tested. Returns two lists:
//   fatal    -- the app cannot work at all (the server refuses to start)
//   warnings -- it will run, but something is probably misconfigured
// Weak-but-present values only warn, so a working deployment is never taken
// down by a stricter rule.

const PLACEHOLDER_SECRET = "replace_this_with_a_long_random_string";

function checkEnv(env = process.env) {
  const fatal = [];
  const warnings = [];

  const secret = env.JWT_SECRET;
  if (!secret) {
    fatal.push("JWT_SECRET is not set -- logins cannot work. Set it to a long random string.");
  } else {
    if (secret === PLACEHOLDER_SECRET) {
      warnings.push("JWT_SECRET is still the example value from .env.example -- anyone could forge a login. Change it.");
    } else if (secret.length < 32) {
      warnings.push("JWT_SECRET is shorter than 32 characters -- use a longer random string.");
    }
  }

  if (!env.MONGO_URI) warnings.push("MONGO_URI is not set -- the database connection will fail.");

  if (env.NODE_ENV === "production") {
    if (!env.CLIENT_ORIGIN) {
      warnings.push("CLIENT_ORIGIN is not set -- the browser will not be allowed to call this API.");
    } else if (/localhost|127\.0\.0\.1/.test(env.CLIENT_ORIGIN)) {
      warnings.push("CLIENT_ORIGIN points at localhost while NODE_ENV is production.");
    }
  }

  return { fatal, warnings };
}

module.exports = { checkEnv, PLACEHOLDER_SECRET };
