import { attendeeEmails, emailList } from "./attendeeEmails.js";

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

// The members' email addresses as one line to paste into Bcc (each once).
export function memberEmailList(members = []) {
  return emailList(members.map((m) => ({ user: { email: m.email } })));
}

export function memberEmailCount(members = []) {
  return attendeeEmails(members.map((m) => ({ user: { email: m.email } }))).length;
}
