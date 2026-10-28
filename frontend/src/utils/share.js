import { formatDateAndTime } from "./formatDate.js";

// Shares an event link: the phone's share sheet (WhatsApp, Messenger...) where
// the browser has one, otherwise copies the link to the clipboard.
// Resolves to "shared", "copied" or "cancelled" (the person closed the share
// sheet -- not an error); rejects if neither route works.
export function shareEvent(event, url = window.location.href) {
  return shareLink(
    { title: event.title, text: `${event.title} -- ${formatDateAndTime(event.date)}, ${event.location}` },
    url
  );
}

// Shares a club's page link the same way. The URL opens that club's details.
export function shareClub(club, url = clubLink(club)) {
  return shareLink({ title: club.name, text: `${club.name} -- a club at PCPS. ${club.description || ""}`.trim() }, url);
}

// Deep link that opens a club's details window on the Clubs page.
export function clubLink(club, origin = window.location.origin) {
  return `${origin}/clubs?club=${encodeURIComponent(club._id)}`;
}

async function shareLink({ title, text }, url) {
  const data = { title, text, url };

  if (typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      return "shared";
    } catch (err) {
      if (err?.name === "AbortError") return "cancelled";
      // Any other failure: fall through and try copying instead.
    }
  }

  await navigator.clipboard.writeText(url);
  return "copied";
}
