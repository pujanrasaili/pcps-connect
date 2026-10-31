const Event = require("../models/Event");
const Registration = require("../models/Registration");
const WaitlistEntry = require("../models/WaitlistEntry");
const ClubMembership = require("../models/ClubMembership");
const EventQuestion = require("../models/EventQuestion");
const Club = require("../models/Club");
const ClubPost = require("../models/ClubPost");
const Notification = require("../models/Notification");
const { notifyEventCancelled } = require("./notifyRegistrants");

// Removes a user and everything that points at them. Shared by the admin
// "delete user" action and a student deleting their own account, so the two
// can't drift apart and leave dangling references.
//
// Only this user's UPCOMING events go with them: other students are registered
// for those, so they are told it's cancelled (this has to happen before their
// Registrations are deleted, it looks them up) and those registrations are
// deleted too. Events that already happened are history -- attendance records,
// certificates and ratings belong to the OTHER students and to the club -- so
// they stay, just without a named organiser.
async function removeUserAndData(user) {
  const upcomingEvents = await Event.find({ createdBy: user._id, date: { $gte: new Date() } });
  for (const upcoming of upcomingEvents) {
    await notifyEventCancelled(upcoming);
  }
  if (upcomingEvents.length > 0) {
    const upcomingIds = upcomingEvents.map((e) => e._id);
    await Registration.deleteMany({ event: { $in: upcomingIds } });
    await WaitlistEntry.deleteMany({ event: { $in: upcomingIds } });
    await EventQuestion.deleteMany({ event: { $in: upcomingIds } });
    await Event.deleteMany({ _id: { $in: upcomingIds } });
  }
  await Registration.deleteMany({ user: user._id });
  await WaitlistEntry.deleteMany({ user: user._id });
  await Notification.deleteMany({ user: user._id });
  // Their public questions go too (the answers to them are no use without the question).
  await EventQuestion.deleteMany({ author: user._id });
  await ClubMembership.deleteMany({ user: user._id });
  await Club.updateMany({ leaders: user._id }, { $pull: { leaders: user._id } });
  // Club news stays, but without the departed person's name on it.
  await ClubPost.updateMany({ author: user._id }, { authorName: "Former club leader" });
  await user.deleteOne();
}

module.exports = { removeUserAndData };
