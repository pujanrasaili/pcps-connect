// Filtering for the Clubs page: category, free-text search, and "only clubs I joined".
export function filterClubs(clubs, { category = "All", query = "", mineOnly = false, isJoined = () => false } = {}) {
  const needle = query.toLowerCase();
  return clubs.filter((club) => {
    if (category !== "All" && club.category !== category) return false;
    if (mineOnly && !isJoined(club._id)) return false;
    return [club.name, club.category, club.description].filter(Boolean).some((field) => field.toLowerCase().includes(needle));
  });
}
