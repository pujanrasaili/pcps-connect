const MAX_NOTE = 80;
const FIRST_YEAR = 2000;

// Checks what a student types when they step down to alumni: an optional year
// they left and an optional short note. Returns { year, note } or { error }.
function cleanAlumniInput(input = {}, now = new Date()) {
  const last = now.getFullYear() + 1;
  let year;
  if (input.year !== undefined && input.year !== null && input.year !== "") {
    year = Number(input.year);
    if (!Number.isInteger(year) || year < FIRST_YEAR || year > last) {
      return { error: `The year must be between ${FIRST_YEAR} and ${last}` };
    }
  }
  let note = "";
  if (input.note !== undefined && input.note !== null) {
    if (typeof input.note !== "string") return { error: "The note must be text" };
    note = input.note.trim().replace(/\s+/g, " ");
    if (note.length > MAX_NOTE) return { error: `The note must be ${MAX_NOTE} characters or fewer` };
  }
  return { year, note };
}

module.exports = { cleanAlumniInput, MAX_NOTE, FIRST_YEAR };
