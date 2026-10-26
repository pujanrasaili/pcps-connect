// The "datetime-local" form fields give a time like "2026-12-30T10:00" with no
// time zone. If that is sent as-is, the server (which runs in UTC) reads it as
// 10:00 UTC, and a student in Nepal (UTC+5:45) then sees the event at 15:45.
// Converting in the browser, where the organiser's own zone is known, sends an
// unambiguous instant instead.

// "YYYY-MM-DDTHH:mm" (browser's zone) -> ISO string in UTC; blank stays blank.
export function localInputToIso(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

// Stored ISO date -> the "YYYY-MM-DDTHH:mm" shape a datetime-local input expects.
export function isoToLocalInput(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
