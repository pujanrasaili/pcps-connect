import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { titleForPath, canonicalForPath } from "../utils/pageTitle";
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
    if (link) link.setAttribute("href", canonicalForPath(pathname));
  }, [pathname, t]);
  return null;
}
