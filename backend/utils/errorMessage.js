// Picks what a failed request is allowed to say back to the client.
//
// In development, the real error message is useful for debugging. In
// production, raw error text (Mongoose cast/validation internals, driver
// errors, stray file paths) shouldn't reach an API caller -- it's either
// confusing or a reconnaissance gift to anyone probing the API. The full
// error is still logged server-side either way.
function safeError(err, fallback) {
  console.error(err);
  if (process.env.NODE_ENV === "production") {
    return fallback;
  }
  return err?.message || fallback;
}

module.exports = { safeError };
