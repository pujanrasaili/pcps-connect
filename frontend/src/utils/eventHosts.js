// Every club running an event: the main club first, then any co-hosts.
// Entries may be populated ({ _id, name }) or bare ids.
export function hostClubs(event) {
  return [event?.club, ...(event?.coHosts || [])].filter(Boolean);
}

export const hostIds = (event) => hostClubs(event).map((c) => c._id || c);

export const hostNames = (event) => hostClubs(event).map((c) => c.name).filter(Boolean);

export const isHostedBy = (event, clubId) => !!clubId && hostIds(event).includes(clubId);
