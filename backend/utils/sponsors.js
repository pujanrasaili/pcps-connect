// Event partners: up to six sponsors an event's organisers thank on the event
// page, each with a name and an optional website. Text only (no logo uploads).
const MAX_SPONSORS = 6;
const MAX_NAME = 60;
const MAX_URL = 200;

// Only http(s) links are kept, so a "javascript:" address can never be shown as a link.
function cleanUrl(value) {
  if (value === undefined || value === null || String(value).trim() === "") return { value: "" };
  const raw = String(value).trim();
  if (raw.length > MAX_URL) return { error: `A website address must be ${MAX_URL} characters or fewer` };
  let url;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { error: "A website address isn't valid" };
  }
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) return { error: "A website address isn't valid" };
  return { value: url.href };
}

// Checks the list an organiser submits. Returns { value: [{ name, url }] } or { error }.
// An empty list removes all sponsors.
function cleanSponsors(input) {
  if (!Array.isArray(input)) return { error: "Sponsors must be a list" };
  if (input.length > MAX_SPONSORS) return { error: `An event can have at most ${MAX_SPONSORS} sponsors` };
  const out = [];
  const seen = new Set();
  for (const s of input) {
    if (!s || typeof s !== "object") return { error: "Each sponsor needs a name" };
    const name = typeof s.name === "string" ? s.name.trim().replace(/\s+/g, " ") : "";
    if (name.length < 2) return { error: "Each sponsor needs a name" };
    if (name.length > MAX_NAME) return { error: `A sponsor name must be ${MAX_NAME} characters or fewer` };
    if (seen.has(name.toLowerCase())) return { error: "Two sponsors can't be the same" };
    seen.add(name.toLowerCase());
    const url = cleanUrl(s.url);
    if (url.error) return { error: url.error };
    out.push({ name, url: url.value });
  }
  return { value: out };
}

module.exports = { cleanSponsors, MAX_SPONSORS, MAX_NAME, MAX_URL };
