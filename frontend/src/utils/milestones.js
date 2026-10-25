// Small goals shown on the profile, worked out only from things the student
// has already done (events attended, clubs joined, events rated). Nothing is
// stored: they are recalculated every time, so they can never get out of date
// or be "awarded" by mistake.
export const MILESTONES = [
  { id: "first-event", title: "First event", description: "Attend your first event", counter: "attended", target: 1 },
  { id: "regular", title: "Regular", description: "Attend 5 events", counter: "attended", target: 5 },
  { id: "campus-star", title: "Campus star", description: "Attend 10 events", counter: "attended", target: 10 },
  { id: "club-member", title: "Club member", description: "Join a club", counter: "clubs", target: 1 },
  { id: "connector", title: "Connector", description: "Join 3 clubs", counter: "clubs", target: 3 },
  { id: "critic", title: "Critic", description: "Rate an event you attended", counter: "rated", target: 1 },
];

// registrations: the student's registrations (each may have attended / rating),
// clubCount: how many clubs they have joined.
export function buildMilestones(registrations = [], clubCount = 0) {
  const attended = registrations.filter((r) => r?.attended).length;
  const rated = registrations.filter((r) => r?.attended && r?.rating).length;
  const counters = { attended, clubs: clubCount, rated };

  return MILESTONES.map(({ counter, target, ...rest }) => {
    const current = Math.min(counters[counter] || 0, target);
    return { ...rest, current, target, earned: current >= target };
  });
}
