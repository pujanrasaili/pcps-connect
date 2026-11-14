import { buildCsv } from "./csv.js";
import { hostNames } from "./eventHosts.js";

export const EVENTS_CSV_HEADER = ["Title", "Date", "Place", "Category", "Hosting clubs", "Price", "Registered", "Capacity", "Pending requests", "Average rating", "Ratings"];

// One row per event, in the order the admin list shows them. The date is an
// ISO timestamp so a spreadsheet sorts it correctly.
export function eventsCsv(events) {
  const rows = events.map((e) => [
    e.title,
    e.date ? new Date(e.date).toISOString() : "",
    e.location || "",
    e.category || "",
    hostNames(e).join(" + "),
    e.price || "",
    e.registeredCount ?? 0,
    e.capacity ?? "",
    e.pendingCount ?? 0,
    e.averageRating != null ? e.averageRating.toFixed(1) : "",
    e.ratingCount ?? 0,
  ]);
  return buildCsv(EVENTS_CSV_HEADER, rows);
}
