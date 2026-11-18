const Event = require("../models/Event");
const { recordAudit } = require("../utils/audit");
const { safeError } = require("../utils/errorMessage");
const { canManageEvent } = require("../utils/clubAccess");
const { cleanQuestions } = require("../utils/signupQuestions");

// PUT /api/events/:id/signup-questions  { questions: [{ _id?, text, required }] }  (organisers)
// Replaces the list (up to 3). People who already registered keep their answers,
// which carry the question text they were given. An empty list switches the
// questions off for everyone who registers from now on.
async function setSignupQuestions(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!(await canManageEvent(req.user, event))) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    const { value, error } = cleanQuestions(req.body?.questions);
    if (error) return res.status(400).json({ message: error });

    event.signupQuestions = value.map((q) => ({ text: q.text, required: q.required }));
    await event.save();
    await recordAudit(req.user, "event.signupQuestions", `Set ${value.length} sign-up question(s) on "${event.title}"`);
    res.status(200).json({ message: "Sign-up questions saved", signupQuestions: event.signupQuestions });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to save the sign-up questions") });
  }
}

module.exports = { setSignupQuestions };
