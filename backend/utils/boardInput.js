// Checks what a student typed for a notice-board post.
// Returns { category, title, body, contact } (cleaned) or { error }.
const CATEGORIES = ["lost", "found", "notice"];
const MAX_TITLE = 80;
const MAX_BODY = 300;
const MAX_CONTACT = 60;
// Posts stay up this long, then disappear.
const DAYS_UP = 14;
// Each student can have this many posts up at once, so nobody fills the board.
const MAX_PER_STUDENT = 3;

function cleanBoardPost(input = {}) {
  const category = typeof input.category === "string" ? input.category : "";
  if (!CATEGORIES.includes(category)) return { error: "Choose Lost, Found or Notice" };
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return { error: "Write a short title" };
  if (title.length > MAX_TITLE) return { error: `The title must be ${MAX_TITLE} characters or fewer` };
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!body) return { error: "Write the details" };
  if (body.length > MAX_BODY) return { error: `The details must be ${MAX_BODY} characters or fewer` };
  const contact = typeof input.contact === "string" ? input.contact.trim() : "";
  if (contact.length > MAX_CONTACT) return { error: `The contact must be ${MAX_CONTACT} characters or fewer` };
  return { category, title, body, contact };
}

module.exports = { cleanBoardPost, CATEGORIES, MAX_TITLE, MAX_BODY, MAX_CONTACT, DAYS_UP, MAX_PER_STUDENT };
