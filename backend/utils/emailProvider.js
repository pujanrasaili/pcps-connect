// Which way outgoing mail is set up, for the health check: "brevo" (HTTPS API),
// "gmail-smtp", or "not-configured". Only the name -- never a key or address.
function emailProvider(env = process.env) {
  if (env.BREVO_API_KEY) return "brevo";
  if (env.EMAIL_USER && env.EMAIL_APP_PASSWORD) return "gmail-smtp";
  return "not-configured";
}

module.exports = { emailProvider };
