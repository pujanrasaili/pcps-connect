// Serves /sitemap.xml (see the rewrite in vercel.json) with the fixed pages
// plus every upcoming or recent event. If the API is slow (free hosting
// waking up) or fails, the fixed pages are still listed, so the sitemap is
// never broken; the edge caches it so Render is rarely asked.
import { DEFAULT_API } from "./_preview.js";
import { buildSitemapXml } from "./_sitemap.js";

const LOOKUP_TIMEOUT_MS = 8000;

export async function loadEvents({ fetchImpl = fetch, apiBase = DEFAULT_API } = {}) {
  try {
    const res = await fetchImpl(`${apiBase}/events`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.events) ? data.events : [];
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  const events = await loadEvents({ apiBase: process.env.API_URL || DEFAULT_API });
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  // A failed lookup is cached only briefly, a good one for an hour.
  res.setHeader("Cache-Control", events.length ? "public, s-maxage=3600, stale-while-revalidate=86400" : "public, s-maxage=60");
  res.status(200).send(buildSitemapXml(events));
}
