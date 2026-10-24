// Safety check for seed.js, which REPLACES all clubs and events. Running it
// against a database that already has real data would wipe that data (and
// leave students' registrations and memberships pointing at clubs that no
// longer exist), so it only proceeds on an empty database unless the person
// explicitly passes --force.
function checkSeedAllowed({ clubCount, eventCount, force }) {
  if (force || (clubCount === 0 && eventCount === 0)) return { allowed: true, message: "" };
  return {
    allowed: false,
    message:
      `This database already has ${clubCount} club(s) and ${eventCount} event(s). ` +
      "Seeding would DELETE all of them. Nothing was changed.\n" +
      "If you really want that (for example on a throwaway development database), run: node seed.js --force",
  };
}

module.exports = { checkSeedAllowed };
