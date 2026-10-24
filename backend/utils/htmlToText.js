// Builds the plain-text alternative of an HTML email. Mail with only an HTML
// part is scored as more spam-like, and is unreadable in text-only clients and
// some notification previews. This keeps links (as "text (url)"), paragraphs
// and list items, and drops styling.

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&#x27;": "'", "&nbsp;": " " };

function decodeEntities(text) {
  return text.replace(/&(amp|lt|gt|quot|nbsp|#39|#x27);/g, (m) => ENTITIES[m] ?? m);
}

function htmlToText(html) {
  if (!html) return "";
  let text = String(html)
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    // Links: "label (url)", or just the url when the label is the url itself.
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => {
      const inner = label.replace(/<[^>]*>/g, "").trim();
      return !inner || inner === href ? href : `${inner} (${href})`;
    })
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|tr|table|ul|ol)>/gi, "\n")
    .replace(/<[^>]*>/g, "");
  text = decodeEntities(text)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}

module.exports = { htmlToText };
