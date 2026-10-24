// Helpers for the emails students can opt out of (club updates, weekly digest,
// event reminders). Opting out happens on the Settings page, so that is where
// links point, and the List-Unsubscribe header makes Gmail and Outlook show
// their own "Unsubscribe" button next to the sender, which keeps these emails
// out of the spam folder.
const DEFAULT_ORIGIN = "https://pcps-connect.vercel.app";

function appOrigin(env = process.env) {
  return (env.CLIENT_ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, "");
}

function settingsUrl(origin = appOrigin()) {
  return `${origin}/settings`;
}

function unsubscribeHeaders(origin = appOrigin()) {
  return { "List-Unsubscribe": `<${settingsUrl(origin)}>` };
}

// An inline "Settings" link for the sentence "turn ... off in Settings".
function settingsLink(origin = appOrigin()) {
  return `<a href="${settingsUrl(origin)}" style="color: #4F46E5;">Settings</a>`;
}

module.exports = { appOrigin, settingsUrl, unsubscribeHeaders, settingsLink };
