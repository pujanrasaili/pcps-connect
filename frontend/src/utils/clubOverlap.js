import { findClash } from "./scheduleClash.js";
import { localInputToIso } from "./dateTimeInput.js";

// While an organiser fills in the event form: another event of the same club
// (as host or co-host) that overlaps the time they typed, or null. The event
// being edited is ignored. Only a heads-up; the organiser can still save.
export function clubOverlap(form, events, editingId, now = new Date()) {
  if (!form?.club || !form.date) return null;
  const date = localInputToIso(form.date);
  const endDate = form.endDate ? localInputToIso(form.endDate) : null;
  const mine = { _id: editingId || "new", date, endDate };
  const id = (c) => String(c?._id || c || "");
  const sameClub = (events || [])
    .filter((e) => [e.club, ...(e.coHosts || [])].some((c) => id(c) === String(form.club)))
    .map((e) => ({ status: "confirmed", event: e }));
  return findClash(mine, sameClub, now);
}
