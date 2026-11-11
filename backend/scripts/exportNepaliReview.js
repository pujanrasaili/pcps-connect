// Writes one page (nepali-review.html) that lists every Nepali sentence next to
// its English original -- the interface text and all the email wording -- so a
// Nepali speaker can read and mark corrections without touching code.
//
//   npm run review:nepali
//
// Then open nepali-review.html in a browser (it also prints well to PDF). Each
// row has a checkbox and a notes box; "Copy my notes" gathers the rows you
// flagged so you can paste them back.
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { escapeHtml } = require("../utils/escapeHtml");
const { COPY } = require("../utils/emailText");
const club = require("../utils/clubEmailText");
const reminder = require("../utils/reminderEmailText");
const notice = require("../utils/noticeEmailText");
const { MAIL } = require("../utils/eventEmailText");

const plain = (html) =>
  String(html)
    .replace(/<br\s*\/?>/g, " ")
    .replace(/<\/p>|<\/div>|<\/tr>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&middot;/g, "·")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

// A catalog of { en: {key: text}, ne: {key: text} } becomes rows.
function fromTable(T) {
  return Object.keys(T.en).map((key) => [key, plain(T.en[key]), plain(T.ne[key] ?? "")]);
}

function accountRows() {
  const rows = [];
  for (const [kind, langs] of Object.entries(COPY)) {
    for (const key of Object.keys(langs.en)) {
      const en = langs.en[key];
      const ne = langs.ne[key];
      rows.push([`${kind} · ${key}`, plain(Array.isArray(en) ? en.join("\n") : en), plain(Array.isArray(ne) ? ne.join("\n") : ne)]);
    }
  }
  return rows;
}

function eventRows() {
  const v = {
    name: "{name}", title: "{event}", rawTitle: "{event}", when: "{date}", where: "{place}",
    messageHtml: "{message}", oldWhen: "{old date}", oldWhere: "{old place}",
    dateChanged: true, locationChanged: true, needsApproval: false,
  };
  return Object.keys(MAIL).map((kind) => {
    const en = MAIL[kind].en(v);
    const ne = MAIL[kind].ne(v);
    const join = (m) => plain([m.subject, m.heading, m.bodyHtml].filter(Boolean).join("\n"));
    return [kind, join(en), join(ne)];
  });
}

// The screens every student sees first. Their text goes at the top of the page,
// so a reviewer who runs out of time still covers what matters most.
const START_HERE_FILES = [
  "components/Navbar.jsx", "components/Footer.jsx", "components/EventCard.jsx", "components/ClubCard.jsx",
  "components/RegistrationForm.jsx", "pages/Home.jsx", "pages/Login.jsx", "pages/Register.jsx",
  "pages/Events.jsx", "pages/EventDetails.jsx", "pages/Clubs.jsx", "pages/Dashboard.jsx",
];

// The newest features, so their wording is reviewed right after the most-seen
// screens instead of being buried in the long "More website text" list. Help
// topics are plain strings (not t() calls), so that file is read for every quoted string.
const NEW_FEATURE_FILES = [
  "pages/Board.jsx", "pages/ActivityRecord.jsx", "pages/EventPoster.jsx", "pages/Settings.jsx",
  "components/EventJoinLink.jsx", "components/EventVolunteers.jsx", "components/VolunteeringCard.jsx",
  "pages/Certificate.jsx", "utils/helpTopics.js", "utils/auditLabels.js",
];

// The English texts those files pass to t("..."); for helpTopics.js,
// auditLabels.js and Settings.jsx (whose row titles are props), every quoted string.
function keysFrom(srcDir, files) {
  const keys = new Set();
  for (const file of files) {
    let code;
    try { code = fs.readFileSync(path.join(srcDir, file), "utf8"); } catch { continue; }
    const pattern = /(utils\/(helpTopics|auditLabels)\.js|pages\/Settings\.jsx)$/.test(file) ? /"((?:[^"\\]|\\.)*)"/g : /\bt\(\s*"((?:[^"\\]|\\.)*)"/g;
    for (const m of code.matchAll(pattern)) {
      try { keys.add(JSON.parse(`"${m[1]}"`)); } catch { /* not a plain string */ }
    }
  }
  return keys;
}

async function main() {
  const neFile = path.join(__dirname, "..", "..", "frontend", "src", "i18n", "ne.js");
  const { ne } = await import(pathToFileURL(neFile).href);
  const srcDir = path.join(__dirname, "..", "..", "frontend", "src");
  const first = keysFrom(srcDir, START_HERE_FILES);
  const recent = keysFrom(srcDir, NEW_FEATURE_FILES);
  const websiteRows = Object.entries(ne).map(([en, text]) => [en.slice(0, 40), en, text]);
  const sections = [
    ["Start here: the text students see most", websiteRows.filter(([, en]) => first.has(en))],
    ["New features: alerts, notice board, activity record, poster, online link, volunteers", websiteRows.filter(([, en]) => !first.has(en) && recent.has(en))],
    ["Account emails", accountRows()],
    ["Event emails", eventRows()],
    ["Club emails", fromTable(club.T)],
    ["Scheduled emails", fromTable(reminder.T)],
    ["Notice emails", fromTable(notice.T)],
    ["More website text", websiteRows.filter(([, en]) => !first.has(en) && !recent.has(en))],
  ];

  const startCount = sections[0][1].length;
  let n = 0;
  const body = sections
    .map(([title, rows]) => {
      const trs = rows
        .map(([key, en, np]) => {
          n += 1;
          return `<tr data-id="${n}"><td><input type="checkbox" aria-label="Needs a fix"></td><td class="en">${escapeHtml(en)}<div class="key">${escapeHtml(key)}</div></td><td class="ne" lang="ne">${escapeHtml(np)}</td><td><input type="text" class="note" aria-label="Suggested wording"></td></tr>`;
        })
        .join("\n");
      return `<h2>${escapeHtml(title)} <small>(${rows.length})</small></h2><table><thead><tr><th>Fix?</th><th>English</th><th>Nepali (draft)</th><th>Better wording</th></tr></thead><tbody>${trs}</tbody></table>`;
    })
    .join("\n");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PCPS Connect Nepali review</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:24px auto;max-width:1100px;padding:0 16px;color:#0f172a}table{width:100%;border-collapse:collapse;margin-bottom:32px}th,td{border:1px solid #cbd5e1;padding:8px;vertical-align:top;text-align:left}th{background:#f1f5f9}.en{white-space:pre-line;width:36%}.ne{white-space:pre-line;width:36%}.key{font-size:11px;color:#64748b;margin-top:4px}.note{width:100%;box-sizing:border-box}small{color:#64748b;font-weight:400}button{padding:10px 16px;font-size:15px;cursor:pointer}tr.flag{background:#fef9c3}textarea{width:100%;height:120px}@media print{button,textarea,.note,input{display:none}}</style></head><body>
<h1>PCPS Connect: Nepali review</h1>
<p><strong>You do not have to do it all.</strong> Start with the first section (${startCount} items, the screens students see most), then the new features and the account emails, send your notes, and carry on with the rest whenever you have time. You can press <em>Copy my notes</em> at any point.</p>
<p>${n} items in total. Tick <em>Fix?</em> on any row that reads wrong, and type a better version. Placeholders in {braces} are filled in by the site; leave them as they are. Then press the button and send the copied text back.</p>
<p><button id="copy">Copy my notes</button></p><textarea id="out" readonly aria-label="Copied notes"></textarea>
${body}
<script>
document.querySelectorAll("tr[data-id] input[type=checkbox]").forEach(function(c){c.addEventListener("change",function(){c.closest("tr").classList.toggle("flag",c.checked)})});
document.getElementById("copy").addEventListener("click",function(){
  var lines=[];
  document.querySelectorAll("tr[data-id]").forEach(function(tr){
    var box=tr.querySelector("input[type=checkbox]").checked, note=tr.querySelector(".note").value.trim();
    if(!box&&!note)return;
    lines.push("EN: "+tr.querySelector(".en").firstChild.textContent.trim()+"\\nNE: "+tr.querySelector(".ne").textContent.trim()+"\\nBETTER: "+(note||"(needs a fix)")+"\\n");
  });
  var out=document.getElementById("out");out.value=lines.join("\\n")||"Nothing flagged.";out.select();
  try{document.execCommand("copy")}catch(e){}
});
</script></body></html>`;

  const target = path.resolve(process.argv[2] || "nepali-review.html");
  fs.writeFileSync(target, html);
  console.log(`Wrote ${n} items to ${target}`);
}

main().catch((err) => {
  console.error("Could not write the review page:", err.message);
  process.exit(1);
});
