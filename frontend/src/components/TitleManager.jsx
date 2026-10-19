import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { titleForPath } from "../utils/pageTitle";

// Keeps the browser tab / history / screen-reader page title in step with the
// route. Pages with data-driven titles (an event's name) set their own.
export default function TitleManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    const title = titleForPath(pathname);
    if (title) document.title = title;
  }, [pathname]);
  return null;
}
