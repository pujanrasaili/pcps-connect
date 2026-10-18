// Shared CSV helpers for the admin exports (attendees, students).

// Wraps a field in quotes and escapes any quotes inside it, so names or emails
// containing commas don't break the column layout.
//
// Names and other profile text come straight from registration with no
// character restrictions, and these files are meant to be opened in Excel. If
// a value starts with =, +, -, @ (or a tab/CR), Excel reads it as a formula
// instead of text -- a student could register as something like
// `=HYPERLINK("http://evil","click")` or a DDE payload that runs when an admin
// opens the export. Prefixing a leading apostrophe forces Excel (and
// Sheets/LibreOffice) to treat it as plain text; it's invisible in the cell.
export function csvField(value) {
  let str = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function buildCsv(header, rows) {
  return [header, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n");
}

// "Hack Night 2026!" -> "hack-night-2026", used to name downloaded files.
export function slugify(text, fallback = "export") {
  return (
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || fallback
  );
}

export function downloadCsv(filename, csv) {
  // Prefix with a UTF-8 BOM so Excel renders non-ASCII names correctly.
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
