// What the admin overview says about how email is set up, from the `email`
// field of GET /api/health: "brevo", "gmail-smtp" or "not-configured".
// Returns null when there is nothing to warn about (Brevo, or an unknown reply).
export function emailNotice(provider) {
  if (provider === "not-configured") {
    return {
      title: "Email isn't set up",
      text: "Students won't receive verification, reminder or announcement emails. Until it is set up, use \"Mark verified\" on the Users page.",
    };
  }
  if (provider === "gmail-smtp") {
    return {
      title: "Emails are sent through Gmail",
      text: "Free hosting such as Render blocks this, so students may not get their verification emails. If that is happening, set up Brevo (README, \"Sending email from Render's free tier\").",
    };
  }
  return null;
}
