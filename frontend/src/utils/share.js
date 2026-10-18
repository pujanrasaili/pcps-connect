import { formatDate } from "./formatDate";

// Shares an event link: the phone's share sheet (WhatsApp, Messenger...) where
// the browser has one, otherwise copies the link to the clipboard.
// Resolves to "shared", "copied" or "cancelled" (the person closed the share
// sheet -- not an error); rejects if neither route works.
export async function shareEvent(event, url = window.location.href) {
  const data = {
    title: event.title,
    text: `${event.title} -- ${formatDate(event.date)}, ${event.location}`,
    url,
  };

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
