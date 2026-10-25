import { api } from "./api";
import { browserStorage, clearTickets, planTicketSync, readTickets, toTicket, writeTickets } from "../utils/offlineTickets";

// Bumped whenever tickets are wiped, so a sync that was already running when
// the student logged out can't write the tickets back afterwards.
let generation = 0;

export function forgetTickets() {
  generation += 1;
  clearTickets(browserStorage());
}

// Keeps the phone's saved tickets (see utils/offlineTickets.js) in step with
// the student's real registrations. Called only after the registrations were
// fetched successfully -- never when offline, so being offline can't wipe the
// very tickets that are meant to work offline.
export async function syncOfflineTickets(registrations) {
  const storage = browserStorage();
  if (!storage) return;
  const startedAt = generation;
  const { keep, need } = planTicketSync(registrations, readTickets(storage));
  const fetched = [];
  for (const registration of need) {
    try {
      const res = await api.get(`/registrations/${registration._id}/check-in-code`);
      fetched.push(toTicket(registration, res.data.code));
    } catch {
      // Try again next time the registrations load; the live QR still works online.
    }
  }
  if (startedAt !== generation) return;
  writeTickets(storage, [...keep, ...fetched]);
}
