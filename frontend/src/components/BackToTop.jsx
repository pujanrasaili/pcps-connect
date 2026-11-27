import { useEffect, useState } from "react";
import { FaArrowUp } from "react-icons/fa";
import { useLang } from "../context/LanguageContext";

// Appears once the visitor has scrolled well down a long page, so getting back
// to the menu is one tap instead of a long swipe or drag.
const SHOW_AFTER_PX = 900;

export default function BackToTop() {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible(window.scrollY > SHOW_AFTER_PX);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  if (!visible) return null;

  const goTop = () => {
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
    // Move keyboard focus to the start of the page so the next Tab begins at the menu.
    document.getElementById("root")?.querySelector("a,button")?.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      onClick={goTop}
      aria-label={t("Back to top")}
      title={t("Back to top")}
      className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex h-11 w-11 items-center justify-center rounded-full bg-primary-700 text-white shadow-soft transition-colors hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 md:right-6 md:bottom-6 print:hidden dark:bg-primary-500 dark:hover:bg-primary-400"
    >
      <FaArrowUp aria-hidden="true" />
    </button>
  );
}
