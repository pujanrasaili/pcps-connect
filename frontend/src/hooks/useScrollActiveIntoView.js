import { useEffect } from "react";

// A menu that scrolls sideways on a phone should open with the current page's
// button in view, not hidden off the edge. Only the menu itself moves (the page
// does not jump), and it does nothing on a computer where the menu is a column.
export function useScrollActiveIntoView(ref, key) {
  useEffect(() => {
    const menu = ref.current;
    const active = menu?.querySelector('[aria-current="page"]');
    if (!menu || !active || menu.scrollWidth <= menu.clientWidth) return;
    const m = menu.getBoundingClientRect();
    const a = active.getBoundingClientRect();
    const target = menu.scrollLeft + (a.left - m.left) - (m.width - a.width) / 2;
    menu.scrollTo({ left: Math.max(0, target), behavior: "instant" });
  }, [ref, key]);
}
