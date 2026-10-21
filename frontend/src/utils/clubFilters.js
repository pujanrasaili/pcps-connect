// Filtering for the Clubs page: category, free-text search, and "only clubs I joined".
export function filterClubs(clubs, { category = "All", query = "", mineOnly = false, isJoined = () => false } = {}) {
  const needle = query.toLowerCase();
  return clubs.filter((club) => {
    if (category !== "All" && club.category !== category) return false;
    if (mineOnly && !isJoined(club._id)) return false;
    return [club.name, club.category, club.description].filter(Boolean).some((field) => field.toLowerCase().includes(needle));
  });
}

export const CLUB_SORTS = [
  ["default", "Default order"],
  ["members", "Most members"],
  ["name", "Name (A-Z)"],
];

// Returns a new, sorted list. Unknown sort keys leave the order alone; clubs
// without a member count sort as zero, ties keep the A-Z name order.
export function sortClubs(clubs, sort) {
  const byName = (a, b) => (a.name || "").localeCompare(b.name || "");
  if (sort === "name") return [...clubs].sort(byName);
  if (sort === "members") return [...clubs].sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0) || byName(a, b));
  return clubs;
}
