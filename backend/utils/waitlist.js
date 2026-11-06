const Registration = require("../models/Registration");
const WaitlistEntry = require("../models/WaitlistEntry");
const sendEmail = require("./sendEmail");
const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");
const { formatEventDate } = require("./formatEventDate");
const { buildIcs } = require("./ics");
const { pickLanguage } = require("./emailText");
const { eventEmail } = require("./eventEmailText");
const { pushNotifications } = require("./inApp");

async function sendSpotOpenedEmail(user, event, needsApproval = false) {
  try {
    const lang = pickLanguage(user.language);
    const mail = eventEmail("spotOpened", lang, {
      name: escapeHtml(user.name),
      title: escapeHtml(event.title),
      rawTitle: event.title,
      when: formatEventDate(event.date, lang),
      where: escapeHtml(event.location),
      needsApproval,
    });
    await sendEmail({
      to: user.email,
      subject: mail.subject,
      html: renderEmail({ heading: mail.heading, bodyHtml: mail.bodyHtml, language: lang }),
      icalEvent: buildIcs(event),
    });
  } catch (err) {
    console.error("Failed to send waitlist promotion email:", err.message);
  }
}

// Moves students from the front of an event's waitlist into real
// registrations while there are free seats. Safe to call any time a seat may
// have opened (someone cancelled, capacity was raised) -- if there's no room
// or nobody waiting it simply does nothing. Never throws for a single
// student's problem; returns how many people were promoted.
async function promoteFromWaitlist(event) {
  let promoted = 0;
  const registered = await Registration.countDocuments({ event: event._id });
  const openSeats = Math.max(0, event.capacity - registered);

  for (let i = 0; i < openSeats; i++) {
    const entry = await WaitlistEntry.findOneAndDelete(
      { event: event._id },
      { sort: { createdAt: 1 } }
    ).populate("user", "name email language");
    if (!entry) break;
    if (!entry.user) continue; // deleted account -- skip, try the next one

    try {
      await Registration.create({ user: entry.user._id, event: event._id, status: event.requiresApproval ? "pending" : "confirmed" });
    } catch (err) {
      if (err.code === 11000) continue; // already registered some other way
      throw err;
    }

    // Same fail-closed re-count registerForEvent does: if someone else
    // took the seat at the same instant, undo this promotion and put the
    // student back at the front of the line.
    const after = await Registration.countDocuments({ event: event._id });
    if (after > event.capacity) {
      await Registration.deleteOne({ user: entry.user._id, event: event._id });
      await WaitlistEntry.create({ user: entry.user._id, event: event._id, createdAt: entry.createdAt });
      break;
    }

    promoted++;
    await pushNotifications([entry.user._id], {
      type: "waitlist_promoted",
      title: event.requiresApproval
        ? `A seat opened for ${event.title} - your request is waiting for approval`
        : `You got a seat: ${event.title}`,
      link: `/events/${event._id}`,
    });
    await sendSpotOpenedEmail(entry.user, event, !!event.requiresApproval);
  }

  return promoted;
}

module.exports = { promoteFromWaitlist };
