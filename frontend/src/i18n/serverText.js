import { getNe } from "./dictionary.js";
import { translate, normalizeLang } from "./translate.js";

// Messages written by the server ("This event is full") arrive in English.
// When the saved language is Nepali and the dictionary has that exact message,
// show the Nepali one; anything else (names, counts, new messages) stays as is.
export function translateServerText(text) {
  if (typeof text !== "string") return text;
  try {
    return translate(getNe() || {}, normalizeLang(localStorage.getItem("pcps_lang")), text);
  } catch {
    return text;
  }
}
