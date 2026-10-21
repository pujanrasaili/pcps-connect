// Pure helpers for link previews. The site is a single-page app, so when a
// link is pasted into WhatsApp, Messenger, Telegram etc. those apps only see
// the same static tags for every page. /api/preview (see preview.js) answers
// *their* crawlers with tags for the specific event or club instead; people
// still get the normal app (see the rewrites in vercel.json).
// Files starting with "_" are not turned into endpoints by Vercel.

export const SITE = "https://pcps-connect.vercel.app";
export const DEFAULT_API = "https://pcps-connect-backend.onrender.com/api";
export const DEFAULT_META = {
  title: "PCPS Connect | Club & Event Management",
  description: "Explore clubs, discover events, and manage your participation at Patan College of Professional Studies.",
  image: `${SITE}/og-image.jpg`,
};

const ID_PATTERN = /^[a-f\d]{24}$/i;
export const isValidId = (id) => typeof id === "string" && ID_PATTERN.test(id);

export function escapeAttr(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// One tidy line of plain text, cut at a word boundary.
export function summarize(text = "", max = 160) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 40))}…`;
}

// Absolute URL for an uploaded picture: Cloudinary links are already absolute,
// older uploads are paths on the API server.
export function absoluteImage(image, apiBase = DEFAULT_API) {
  if (!image) return DEFAULT_META.image;
  if (/^https?:\/\//i.test(image)) return image;
  return `${apiBase.replace(/\/api\/?$/, "")}${image.startsWith("/") ? "" : "/"}${image}`;
}

function formatWhen(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "Asia/Kathmandu",
  });
}

export function eventMeta(event, apiBase) {
  const facts = [formatWhen(event.date), event.location].filter(Boolean).join(" · ");
  return {
    title: `${event.title} | PCPS Connect`,
    description: summarize(facts + (event.description ? ` — ${event.description}` : "")),
    image: absoluteImage(event.image, apiBase),
    url: `${SITE}/events/${event._id}`,
  };
}

export function clubMeta(club, apiBase) {
  return {
    title: `${club.name} | PCPS Connect`,
    description: summarize(club.longDescription || club.description || `${club.name} — a club at PCPS.`),
    image: absoluteImage(club.image, apiBase),
    url: `${SITE}/clubs?club=${club._id}`,
  };
}

// A tiny HTML page for the crawler. If a person somehow lands on it, the
// refresh sends them straight to the real page.
export function buildPreviewHtml({ title, description, image, url }) {
  const t = escapeAttr(title);
  const d = escapeAttr(description);
  const i = escapeAttr(image);
  const u = escapeAttr(url);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${t}</title>
<meta name="description" content="${d}" />
<link rel="canonical" href="${u}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="PCPS Connect" />
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:url" content="${u}" />
<meta property="og:image" content="${i}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" />
<meta name="twitter:image" content="${i}" />
<meta http-equiv="refresh" content="0;url=${u}" />
</head>
<body><a href="${u}">${t}</a></body>
</html>
`;
}
