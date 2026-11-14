// The only club fields an admin form may set. Anything else in a request body
// -- notably `leaders` (which has its own validated endpoint with a 10-person
// cap and notification emails) and `createdBy` -- is ignored rather than
// written straight into the database.
const CLUB_FIELDS = [
  "name",
  "category",
  "description",
  "longDescription",
  "image",
  "icon",
  "activities",
  "leadName",
  "leadRole",
  "email",
  "foundedYear",
  "meetings",
  "requiresApproval",
];

// What a club's own leaders may edit themselves (PATCH /api/leader/clubs/:id):
// the text that describes the club. Its name, category, icon, image, who leads
// it and whether joining needs approval stay with the admins.
const LEADER_CLUB_FIELDS = ["description", "longDescription", "activities", "meetings", "email"];

function pickLeaderClubFields(body = {}) {
  const picked = {};
  for (const field of LEADER_CLUB_FIELDS) {
    if (body[field] !== undefined) picked[field] = body[field];
  }
  return picked;
}

function pickClubFields(body = {}) {
  const picked = {};
  for (const field of CLUB_FIELDS) {
    if (body[field] !== undefined) picked[field] = body[field];
  }
  return picked;
}

module.exports = { CLUB_FIELDS, LEADER_CLUB_FIELDS, pickClubFields, pickLeaderClubFields };
