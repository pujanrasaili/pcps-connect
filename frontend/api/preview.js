// Serves link-preview tags to chat apps' crawlers (see vercel.json). Looks the
// event or club up from the API; if that is slow (free hosting waking up) or
// fails, falls back to the site's general tags so a preview is never broken.
import { DEFAULT_API, DEFAULT_META, SITE, buildPreviewHtml, clubMeta, eventMeta, isValidId } from "./_preview.js";

const LOOKUP_TIMEOUT_MS = 3500;

export async function loadMeta(type, id, { fetchImpl = fetch, apiBase = DEFAULT_API } = {}) {
  const fallback = { ...DEFAULT_META, url: type === "club" ? `${SITE}/clubs` : `${SITE}/events` };
  if (!isValidId(id) || (type !== "event" && type !== "club")) return fallback;
  try {
    const path = type === "club" ? `clubs/${id}` : `events/${id}`;
    const res = await fetchImpl(`${apiBase}/${path}`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    if (type === "club" && data.club) return clubMeta(data.club, apiBase);
    if (type === "event" && data.event) return eventMeta(data.event, apiBase);
    return fallback;
  } catch {
    return fallback;
  }
}

export default async function handler(req, res) {
  const { type, id } = req.query || {};
  const meta = await loadMeta(type, id, { apiBase: process.env.API_URL || DEFAULT_API });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Crawlers re-fetch rarely; let the edge cache it so Render isn't hit each time.
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.status(200).send(buildPreviewHtml(meta));
}
