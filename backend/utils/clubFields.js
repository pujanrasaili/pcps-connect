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
];

function pickClubFields(body = {}) {
  const picked = {};
  for (const field of CLUB_FIELDS) {
    if (body[field] !== undefined) picked[field] = body[field];
  }
  return picked;
}

module.exports = { CLUB_FIELDS, pickClubFields };
