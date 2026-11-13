// schema.org "Event" data for an event's page, so search engines can show it
// as an event (date, place, price) in results. Returns null when the event
// lacks what search engines require (a name and a valid start date).
import { hostNames } from "./eventHosts.js";

const ADDRESS = "Patan College of Professional Studies, Kandevatasthan, Lalitpur, Nepal";

const isoOrNull = (value) => {
  const d = new Date(value);
  return value && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
};

// "Rs. 1,500" -> "1500"; "Free" -> "0"; text without a number -> null.
export function priceNumber(price) {
  const text = String(price ?? "").trim();
  if (!text || /^(free|no charge|nil)$/i.test(text)) return "0";
  const match = text.match(/\d[\d,]*(?:\.\d+)?/);
  return match ? match[0].replace(/,/g, "") : null;
}

export function eventJsonLd(event, origin) {
  const startDate = isoOrNull(event?.date);
  if (!event?.title || !startDate || !event?._id) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: String(event.title),
    startDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: `${origin}/events/${event._id}`,
    location: { "@type": "Place", name: event.location || "PCPS College", address: ADDRESS },
  };
  const endDate = isoOrNull(event.endDate);
  if (endDate) data.endDate = endDate;
  if (event.description) data.description = String(event.description).slice(0, 300);
  // The banner first, then the event's own photos (search engines take a list).
  const images = [event.image, ...(Array.isArray(event.photos) ? event.photos : [])]
    .filter((u) => typeof u === "string" && /^https?:\/\//.test(u))
    .slice(0, 6);
  if (images.length) data.image = images;
  const hosts = hostNames(event).map((name) => ({ "@type": "Organization", name }));
  if (hosts.length) data.organizer = hosts.length === 1 ? hosts[0] : hosts;
  const price = priceNumber(event.price);
  if (price !== null) data.offers = { "@type": "Offer", price, priceCurrency: "NPR", url: data.url };
  return data;
}

// Safe to put inside a <script>: "<" can never start a closing tag.
export function jsonLdText(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
