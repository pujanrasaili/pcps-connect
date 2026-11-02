// The text search results show under an event's title: date and place first
// (what people search for), then the start of the description.
import { formatDate } from "./formatDate.js";

const MAX = 160;

export function eventMetaDescription(event) {
  if (!event?.title) return null;
  const when = event.date && !Number.isNaN(new Date(event.date).getTime()) ? formatDate(event.date) : "";
  const lead = [when, event.location].filter(Boolean).join(" at ");
  const body = String(event.description || "").replace(/\s+/g, " ").trim();
  const text = [lead, body].filter(Boolean).join(". ");
  if (!text) return null;
  if (text.length <= MAX) return text;
  const cut = text.slice(0, MAX - 1);
  return cut.slice(0, cut.lastIndexOf(" ") > 60 ? cut.lastIndexOf(" ") : cut.length).replace(/[\s.,;:]+$/, "") + "…";
}
