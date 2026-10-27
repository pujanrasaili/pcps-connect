// Links for subscribing to the events calendar in a phone or desktop calendar
// app. The feed itself is served by the API (GET /api/events/calendar.ics), so
// new and changed events show up in the person's calendar without any action.

// The https address of the feed, optionally for one club.
export function feedUrl(apiBase, clubId = "") {
  const base = String(apiBase || "").replace(/\/$/, "");
  return `${base}/events/calendar.ics${clubId ? `?club=${encodeURIComponent(clubId)}` : ""}`;
}

// The same address with the webcal:// scheme, which makes Apple/Outlook
// calendars offer to subscribe when it is opened.
export function webcalUrl(url) {
  return String(url).replace(/^https?:\/\//, "webcal://");
}

// Google Calendar's "add by URL" shortcut.
export function googleSubscribeUrl(url) {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl(url))}`;
}

// Feeds only work from a public address; a local development API can't be
// reached by Google's servers, so the Google shortcut is skipped there.
export function isPublicUrl(url) {
  try {
    const { hostname } = new URL(url);
    return !["localhost", "127.0.0.1", "[::1]"].includes(hostname);
  } catch {
    return false;
  }
}
