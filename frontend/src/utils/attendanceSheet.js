// A paper sign-in sheet for the door, for when phones or the internet let you
// down: confirmed students in alphabetical order with a tick box and a
// signature line. Built as a small standalone HTML page that the browser prints.
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// The answer a person gave to one sign-up question ("" when none).
export const answerTo = (answers, question) => (answers || []).find((a) => a.question === question.text)?.answer || "";

export function sheetRows(registrations = [], questions = []) {
  return registrations
    .filter((r) => r.status !== "pending")
    .map((r) => ({
      name: r.user?.name || "Unknown student",
      studentId: r.user?.studentId || "",
      attended: !!r.attended,
      answers: questions.map((q) => answerTo(r.answers, q)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function buildSheetHtml(event, registrations, dateText = "") {
  const questions = event?.signupQuestions || [];
  const rows = sheetRows(registrations, questions);
  const body = rows
    .map(
      (r, i) =>
        `<tr><td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.studentId)}</td>${r.answers.map((a) => `<td>${escapeHtml(a)}</td>`).join("")}<td class="box">${r.attended ? "&#10003;" : ""}</td><td></td></tr>`
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(event?.title || "Event")} - sign-in sheet</title>
<style>
body{font-family:Arial,sans-serif;margin:24px;color:#111}
h1{font-size:20px;margin:0 0 4px}p{margin:0 0 16px;color:#444;font-size:13px}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{border:1px solid #888;padding:6px 8px;text-align:left}
th{background:#eee}.box{width:60px;text-align:center}td:last-child{width:25%}
tr{page-break-inside:avoid}
</style></head><body>
<h1>${escapeHtml(event?.title || "Event")}</h1>
<p>${escapeHtml(dateText)}${dateText ? " &middot; " : ""}${rows.length} registered</p>
<table><thead><tr><th>#</th><th>Name</th><th>Student ID</th>${questions.map((q) => `<th>${escapeHtml(q.text)}</th>`).join("")}<th class="box">Here</th><th>Signature</th></tr></thead><tbody>${body}</tbody></table>
</body></html>`;
}
