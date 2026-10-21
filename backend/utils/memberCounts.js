// Adds a public `memberCount` to each club. Only the number is exposed, never
// who the members are. `counts` is the ClubMembership aggregation output
// ([{ _id: clubId, members }]); clubs nobody joined get 0.
function withMemberCounts(clubs, counts) {
  const byClub = new Map(counts.map((c) => [String(c._id), c.members]));
  return clubs.map((club) => {
    const plain = typeof club.toObject === "function" ? club.toObject() : { ...club };
    return { ...plain, memberCount: byClub.get(String(plain._id)) || 0 };
  });
}

module.exports = { withMemberCounts };
