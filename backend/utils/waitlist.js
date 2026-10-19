const Registration = require("../models/Registration");
const WaitlistEntry = require("../models/WaitlistEntry");
const sendEmail = require("./sendEmail");
const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");
const { formatEventDate } = require("./formatEventDate");
const { buildIcs } = require("./ics");

async function sendSpotOpenedEmail(user, event) {
  try {
    await sendEmail({
      to: user.email,
      subject: `A spot opened up: ${event.title}`,
      html: renderEmail({
        heading: "You're in!",
        bodyHtml: `
          <p style="margin: 0 0 12px;">Hi ${escapeHtml(user.name)},</p>
          <p style="margin: 0 0 16px;">A spot opened up for <strong>${escapeHtml(event.title)}</strong> and you were next on the waitlist, so you're now registered.</p>
          <p style="margin: 0 0 4px;"><strong>When:</strong> ${formatEventDate(event.date)}</p>
          <p style="margin: 0;"><strong>Where:</strong> ${escapeHtml(event.location)}</p>
          <p style="margin: 16px 0 0;">Can't make it any more? Unregister from your Dashboard so the next person gets the spot.</p>
        `,
      }),
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
    ).populate("user", "name email");
    if (!entry) break;
    if (!entry.user) continue; // deleted account -- skip, try the next one

    try {
      await Registration.create({ user: entry.user._id, event: event._id, status: "confirmed" });
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
    await sendSpotOpenedEmail(entry.user, event);
  }

  return promoted;
}

module.exports = { promoteFromWaitlist };
