import { buildCsv } from "./csv.js";

export const ACTIVITY_CSV_HEADER = ["When", "Who", "Action", "Detail"];

// The activity log as a spreadsheet. `label` turns a raw action code into the
// same English label the page shows.
export function activityCsv(entries, label) {
  const rows = entries.map((e) => [
    e.createdAt ? new Date(e.createdAt).toISOString() : "",
    e.actorName || "",
    label(e.action),
    e.summary || "",
  ]);
  return buildCsv(ACTIVITY_CSV_HEADER, rows);
}
