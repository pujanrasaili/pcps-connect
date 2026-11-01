// What the Join button on a club should say and do, from the student's point
// of view. A club that approves its members turns "Join" into a request, and
// a request that is waiting can be withdrawn.
export function joinButtonState({ club, joined, pending }) {
  if (joined) return { kind: "joined", label: "Joined", hint: "Tap to leave this club" };
  if (pending) return { kind: "pending", label: "Request sent", hint: "Waiting for the club's leaders. Tap to withdraw" };
  if (club?.requiresApproval) return { kind: "request", label: "Request to join", hint: "" };
  return { kind: "join", label: "Join Club", hint: "" };
}
