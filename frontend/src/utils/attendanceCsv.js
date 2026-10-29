import { buildCsv } from "./csv.js";

// One row per past event, for the report staff hand to the college.
export function attendanceCsv(report) {
  const header = ["Event", "Club", "Date", "Registered", "Attended", "No-shows", "Attendance %", "Average rating", "Ratings"];
  const rows = (report?.events || []).map((e) => [
    e.title,
    e.club || "",
    e.date ? new Date(e.date).toISOString().slice(0, 10) : "",
    e.registered,
    e.attended,
    e.noShows,
    e.attendanceRate === null ? "" : e.attendanceRate,
    e.averageRating === null || e.averageRating === undefined ? "" : e.averageRating.toFixed(1),
    e.ratingCount ?? "",
  ]);
  return buildCsv(header, rows);
}
