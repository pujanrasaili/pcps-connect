// Checks the online-meeting link an organiser pastes. Returns { link } (cleaned;
// "" means "remove it") or { error }. Only https addresses without a login part
// are accepted, so the button students see can't hide a javascript: address.
const MAX_LINK = 300;

function cleanJoinLink(input) {
  if (input === undefined || input === null) return { link: "" };
  if (typeof input !== "string") return { error: "Paste a link that starts with https://" };
  const text = input.trim();
  if (!text) return { link: "" };
  if (text.length > MAX_LINK) return { error: `The link must be ${MAX_LINK} characters or fewer` };
  let url;
  try {
    url = new URL(text);
  } catch {
    return { error: "Paste a link that starts with https://" };
  }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) {
    return { error: "Paste a link that starts with https://" };
  }
  return { link: url.href };
}

module.exports = { cleanJoinLink, MAX_LINK };
