// Narrow a club's member list by name, email or student ID (case-insensitive).
export function filterMembers(members = [], search = "") {
  const q = search.trim().toLowerCase();
  if (!q) return members;
  return members.filter(
    (m) =>
      (m.name || "").toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q) ||
      (m.studentId || "").toLowerCase().includes(q)
  );
}
