// "Save for later" bookmarks live in this browser only (no account needed),
// so these helpers just turn the stored text into a clean list of event ids.

export const SAVED_KEY = "pcps.savedEvents";
const MAX_SAVED = 200;

// Tolerates anything: missing, hand-edited, or corrupted storage gives [].
export function parseSaved(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id) => typeof id === "string" && id))].slice(0, MAX_SAVED);
  } catch {
    return [];
  }
}

// Returns a new list with the id added (newest first) or removed.
export function toggleSaved(ids, id) {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  return [id, ...ids].slice(0, MAX_SAVED);
}
