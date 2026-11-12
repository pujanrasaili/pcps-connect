// Looks up the Nepali version of an English interface string. English text is
// the key, so a string nobody has translated yet simply stays in English
// (never blank, never a raw key), and a page can be translated one string at
// a time.
export function translate(dictionary, lang, text) {
  if (lang !== "ne" || typeof text !== "string") return text;
  return Object.prototype.hasOwnProperty.call(dictionary, text) ? dictionary[text] : text;
}

// Fills {name}-style placeholders: format("{n} spots left", { n: 3 }).
export function format(template, values = {}) {
  // A missing value (an event with no category, say) stays missing rather than turning into the word "undefined".
  if (typeof template !== "string") return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}

export const SUPPORTED_LANGS = ["en", "ne"];

export function normalizeLang(value) {
  return SUPPORTED_LANGS.includes(value) ? value : "en";
}
