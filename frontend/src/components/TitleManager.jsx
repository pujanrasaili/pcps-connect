import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { titleForPath, canonicalForPath, descriptionForPath, isNoIndexPath } from "../utils/pageTitle";
import { useLang } from "../context/LanguageContext";

// Keeps the browser tab / history / screen-reader page title in step with the
// route. Pages with data-driven titles (an event's name) set their own.
export default function TitleManager() {
  const { pathname } = useLocation();
  const { t } = useLang();
  useEffect(() => {
    const title = titleForPath(pathname, t);
    if (title) document.title = title;
    const link = document.querySelector('link[rel="canonical"]');
    const canonical = canonicalForPath(pathname);
    if (link) link.setAttribute("href", canonical);

    // The snippet under the title in search results, and the same text and
    // address for link previews that read them from the page.
    const description = descriptionForPath(pathname, t);
    if (description) {
      document.querySelector('meta[name="description"]')?.setAttribute("content", description);
      document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
      document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", description);
    }
    if (title) {
      document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
      document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", title);
    }
    document.querySelector('meta[property="og:url"]')?.setAttribute("content", canonical);

    // Private and account pages ask search engines not to list them.
    let robots = document.querySelector('meta[name="robots"]');
    if (isNoIndexPath(pathname)) {
      if (!robots) {
        robots = document.createElement("meta");
        robots.setAttribute("name", "robots");
        document.head.appendChild(robots);
      }
      robots.setAttribute("content", "noindex, nofollow");
    } else {
      robots?.remove();
    }
  }, [pathname, t]);
  return null;
}
