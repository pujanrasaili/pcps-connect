// Answers to a signed-in request hold that person's own data (registrations,
// notifications, answers to sign-up questions). Tell the browser not to keep
// them, so on a shared lab computer the next student can't read them from the
// cache or the back button after logging out. Visitors without a login cookie
// still get the ordinary public answers, which may be revalidated as before.
// A route that sets its own Cache-Control (the venue list, the calendar feed)
// simply overrides this.
function privateCache(req, res, next) {
  if (req.cookies && req.cookies.token) res.set("Cache-Control", "no-store");
  next();
}

module.exports = { privateCache };
