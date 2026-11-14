import { buildCsv } from "./csv.js";

export const CLUBS_CSV_HEADER = ["Name", "Category", "Members", "Founded", "Contact email", "Meets", "Approves new members"];

export function clubsCsv(clubs) {
  const rows = clubs.map((c) => [
    c.name,
    c.category || "",
    c.memberCount ?? 0,
    c.foundedYear || "",
    c.email || "",
    c.meetings || "",
    c.requiresApproval ? "Yes" : "No",
  ]);
  return buildCsv(CLUBS_CSV_HEADER, rows);
}
