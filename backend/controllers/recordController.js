const Registration = require("../models/Registration");
const EventVolunteer = require("../models/EventVolunteer");
const ClubMembership = require("../models/ClubMembership");
const { safeError } = require("../utils/errorMessage");

const byDateNewest = (a, b) => new Date(b.date) - new Date(a.date);

// GET /api/registrations/record  (requires login)
// The student's own activity record: events they attended (as marked by the
// organisers), events they helped at, and the clubs they belong to. Only their
// own data, and only attendance an organiser confirmed.
async function getMyRecord(req, res) {
  try {
    const [registrations, helpers, memberships] = await Promise.all([
      Registration.find({ user: req.user._id, attended: true }).populate({ path: "event", select: "title date club", populate: { path: "club", select: "name" } }),
      EventVolunteer.find({ user: req.user._id, attended: true }).populate("event", "title date volunteerRoles"),
      ClubMembership.find({ user: req.user._id }).populate("club", "name"),
    ]);

    const attended = registrations
      .filter((r) => r.event)
      .map((r) => ({ title: r.event.title, date: r.event.date, club: r.event.club?.name || "" }))
      .sort(byDateNewest);
    const helped = helpers
      .filter((h) => h.event)
      .map((h) => ({
        title: h.event.title,
        date: h.event.date,
        role: (h.event.volunteerRoles || []).find((r) => String(r._id) === String(h.role))?.name || "",
      }))
      .sort(byDateNewest);
    const clubs = memberships.map((m) => m.club?.name).filter(Boolean).sort((a, b) => a.localeCompare(b));

    res.status(200).json({
      record: {
        studentName: req.user.name,
        studentId: req.user.studentId || "",
        program: req.user.program || "",
        attended,
        helped,
        clubs,
      },
    });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to build your activity record") });
  }
}

module.exports = { getMyRecord };
