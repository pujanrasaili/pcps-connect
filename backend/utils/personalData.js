// Shapes the "download my data" file. Built from an explicit allow-list so
// credentials, tokens and internal flags can never end up in it, and kept
// free of database calls so it's easy to test.
const iso = (d) => (d ? new Date(d).toISOString() : null);

function buildPersonalData({ user, registrations = [], waitlist = [], memberships = [], ledClubs = [], notifications = [] }, now = new Date()) {
  return {
    exportedAt: now.toISOString(),
    profile: {
      name: user.name,
      email: user.email,
      studentId: user.studentId || "",
      program: user.program || "",
      semester: user.semester || "",
      phone: user.phone || "",
      avatar: user.avatar || "",
      role: user.role,
      favoriteClub: user.favoriteClub?.name || null,
      emailNotifications: {
        eventReminders: user.eventReminders !== false,
        clubUpdates: user.clubUpdates !== false,
      },
      joined: iso(user.createdAt),
    },
    registrations: registrations
      .filter((r) => r.event)
      .map((r) => ({
        event: r.event.title,
        eventDate: iso(r.event.date),
        status: r.status,
        attended: !!r.attended,
        rating: r.rating ?? null,
        feedback: r.feedback || "",
        registeredAt: iso(r.createdAt),
      })),
    waitlist: waitlist
      .filter((w) => w.event)
      .map((w) => ({ event: w.event.title, eventDate: iso(w.event.date), joinedAt: iso(w.createdAt) })),
    clubMemberships: memberships
      .filter((m) => m.club)
      .map((m) => ({ club: m.club.name, joinedAt: iso(m.createdAt) })),
    clubsYouLead: ledClubs.map((c) => c.name),
    notifications: notifications.map((n) => ({ message: n.title, read: !!n.read, receivedAt: iso(n.createdAt) })),
  };
}

module.exports = { buildPersonalData };
