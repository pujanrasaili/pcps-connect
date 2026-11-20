// The email addresses of the students an organiser can write to from the
// attendee list: confirmed registrations only (people still waiting for
// approval are not attending yet), each address once, blanks left out.
export function attendeeEmails(registrations) {
  const seen = new Set();
  const out = [];
  for (const r of registrations || []) {
    if (r.status === "pending") continue;
    const email = String(r.user?.email || "").trim();
    const key = email.toLowerCase();
    if (!email || seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }
  return out;
}

// One line a mail app accepts in To / Bcc (semicolons are understood by Outlook
// and Gmail alike when pasted, but commas work everywhere).
export function emailList(registrations) {
  return attendeeEmails(registrations).join(", ");
}
