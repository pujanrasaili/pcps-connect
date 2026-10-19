const Event = require("../models/Event");
const Registration = require("../models/Registration");
const WaitlistEntry = require("../models/WaitlistEntry");
const ClubMembership = require("../models/ClubMembership");
const Club = require("../models/Club");
const { notifyEventCancelled } = require("./notifyRegistrants");

// Removes a user and everything that points at them. Shared by the admin
// "delete user" action and a student deleting their own account, so the two
// can't drift apart and leave dangling references.
//
// Events this user created go with them -- but other students are registered
// for those events. Tell them it's cancelled (this has to happen before their
// Registrations are deleted, it looks them up) and delete those registrations
// too, otherwise they're left pointing at events that no longer exist.
async function removeUserAndData(user) {
  const ownedEvents = await Event.find({ createdBy: user._id });
  for (const ownedEvent of ownedEvents) {
    await notifyEventCancelled(ownedEvent);
  }
  if (ownedEvents.length > 0) {
    const ownedIds = ownedEvents.map((e) => e._id);
    await Registration.deleteMany({ event: { $in: ownedIds } });
    await WaitlistEntry.deleteMany({ event: { $in: ownedIds } });
  }
  await Event.deleteMany({ createdBy: user._id });
  await Registration.deleteMany({ user: user._id });
  await WaitlistEntry.deleteMany({ user: user._id });
  await ClubMembership.deleteMany({ user: user._id });
  await Club.updateMany({ leaders: user._id }, { $pull: { leaders: user._id } });
  await user.deleteOne();
}

module.exports = { removeUserAndData };
