const Registration = require("../models/Registration");
const EventVolunteer = require("../models/EventVolunteer");
const { verifyCertificateCode, verifyVolunteerCertificateCode } = require("../utils/certificateCode");
const { safeError } = require("../utils/errorMessage");

// GET /api/certificates/verify/:code  (public)
// Lets anyone who scans the QR on a certificate confirm it's real. Only
// reveals what's printed on the certificate itself, and only for a code the
// server signed for a registration that was actually marked attended -- an
// edited or invented certificate fails here.
async function verifyCertificate(req, res) {
  try {
    const registrationId = verifyCertificateCode(req.params.code);
    if (!registrationId) {
      // Not an attendance certificate: maybe a volunteering one.
      const volunteerId = verifyVolunteerCertificateCode(req.params.code);
      if (!volunteerId) return res.status(404).json({ valid: false });
      const helper = await EventVolunteer.findById(volunteerId).populate("user", "name").populate("event", "title date volunteerRoles");
      if (!helper || !helper.attended || !helper.user || !helper.event) return res.status(404).json({ valid: false });
      const role = (helper.event.volunteerRoles || []).find((r) => String(r._id) === String(helper.role));
      return res.status(200).json({
        valid: true,
        student: { name: helper.user.name },
        event: { title: helper.event.title, date: helper.event.date },
        volunteerRole: role ? role.name : "",
      });
    }

    const registration = await Registration.findById(registrationId)
      .populate("user", "name")
      .populate("event", "title date");
    if (!registration || !registration.attended || !registration.user || !registration.event) {
      return res.status(404).json({ valid: false });
    }

    res.status(200).json({
      valid: true,
      student: { name: registration.user.name },
      event: { title: registration.event.title, date: registration.event.date },
    });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to verify certificate") });
  }
}

module.exports = { verifyCertificate };
