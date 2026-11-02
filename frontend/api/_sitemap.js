// Builds /sitemap.xml. The site is a single-page app, so a static sitemap can
// only list fixed pages; event pages are created by admins all the time, so
// the sitemap is generated from the API (see sitemap.js and vercel.json).
import { SITE, isValidId } from "./_preview.js";

export const STATIC_PATHS = ["/", "/clubs", "/events", "/contact", "/terms", "/privacy", "/help"];
const MAX_EVENTS = 500;
const RECENT_MS = 30 * 24 * 60 * 60 * 1000; // events that ended over a month ago are not worth crawling

const xmlEscape = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const lastmod = (value) => {
  const d = new Date(value);
  return value && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
};

// Upcoming and recent events with a well-formed id, soonest first.
export function sitemapEvents(events, now = new Date()) {
  return (Array.isArray(events) ? events : [])
    .filter((e) => isValidId(e?._id) && !Number.isNaN(new Date(e.date).getTime()) && new Date(e.date).getTime() >= now.getTime() - RECENT_MS)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, MAX_EVENTS);
}

export function buildSitemapXml(events = [], now = new Date()) {
  const urls = STATIC_PATHS.map((p) => `  <url><loc>${xmlEscape(SITE + (p === "/" ? "/" : p))}</loc></url>`);
  for (const event of sitemapEvents(events, now)) {
    const mod = lastmod(event.updatedAt);
    urls.push(`  <url><loc>${xmlEscape(`${SITE}/events/${event._id}`)}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ""}</url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}
