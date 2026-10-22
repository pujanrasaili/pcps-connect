// The organiser's name is public (event cards say "Organized by ..."), but their
// email is only for logged-in students: it must not be readable by anyone on the
// internet, or scraped in bulk from the public events list.
function hideOrganiserEmail(event, viewer) {
  if (viewer || !event?.createdBy || typeof event.createdBy !== "object") return event;
  const { email, ...organiser } = event.createdBy; // eslint-disable-line no-unused-vars
  return { ...event, createdBy: organiser };
}

module.exports = { hideOrganiserEmail };
