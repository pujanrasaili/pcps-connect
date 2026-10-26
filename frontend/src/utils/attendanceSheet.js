// A paper sign-in sheet for the door, for when phones or the internet let you
// down: confirmed students in alphabetical order with a tick box and a
// signature line. Built as a small standalone HTML page that the browser prints.
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function sheetRows(registrations = []) {
  return registrations
    .filter((r) => r.status !== "pending")
    .map((r) => ({
      name: r.user?.name || "Unknown student",
      studentId: r.user?.studentId || "",
      attended: !!r.attended,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function buildSheetHtml(event, registrations, dateText = "") {
  const rows = sheetRows(registrations);
  const body = rows
    .map(
      (r, i) =>
        `<tr><td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.studentId)}</td><td class="box">${r.attended ? "&#10003;" : ""}</td><td></td></tr>`
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(event?.title || "Event")} - sign-in sheet</title>
<style>
body{font-family:Arial,sans-serif;margin:24px;color:#111}
h1{font-size:20px;margin:0 0 4px}p{margin:0 0 16px;color:#444;font-size:13px}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{border:1px solid #888;padding:6px 8px;text-align:left}
th{background:#eee}.box{width:60px;text-align:center}td:last-child{width:30%}
tr{page-break-inside:avoid}
</style></head><body>
<h1>${escapeHtml(event?.title || "Event")}</h1>
<p>${escapeHtml(dateText)}${dateText ? " &middot; " : ""}${rows.length} registered</p>
<table><thead><tr><th>#</th><th>Name</th><th>Student ID</th><th class="box">Here</th><th>Signature</th></tr></thead><tbody>${body}</tbody></table>
</body></html>`;
}
