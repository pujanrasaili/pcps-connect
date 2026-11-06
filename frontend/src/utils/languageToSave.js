// When someone is logged in and the site is showing a different language than
// the one saved on their account, the account should follow what they use, so
// account emails come in the language they read. Returns the language to save,
// or null when nothing needs saving. `alreadyTried` stops a failed save from
// being retried in a loop.
export function languageToSave(user, lang, alreadyTried) {
  if (!user || !user.language) return null; // not logged in, or an older server
  if (lang !== "en" && lang !== "ne") return null;
  if (user.language === lang) return null;
  if (alreadyTried === `${user.id}:${lang}`) return null;
  return lang;
}
