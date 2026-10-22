// A short checklist for new students: the three things that make the app
// useful. It disappears by itself once all of them are done.
export function gettingStartedSteps({ joinedClubs = 0, favoriteClub = null, registrations = 0 } = {}) {
  return [
    { id: "join", label: "Join a club", hint: "Clubs you join send you their events.", to: "/clubs", done: joinedClubs > 0 },
    { id: "favorite", label: "Pick a favourite club", hint: "Tap the heart on a club to bookmark it.", to: "/clubs", done: Boolean(favoriteClub) },
    { id: "register", label: "Register for an event", hint: "Your QR code and reminders appear here.", to: "/events", done: registrations > 0 },
  ];
}

// null once the two essentials (join a club, register for an event) are done:
// picking a favourite is optional, so it never keeps the card around.
export function pendingGettingStarted(input) {
  const steps = gettingStartedSteps(input);
  const essentialsDone = steps.filter((s) => s.id !== "favorite").every((s) => s.done);
  if (essentialsDone) return null;
  return { steps, done: steps.filter((s) => s.done).length, total: steps.length };
}
