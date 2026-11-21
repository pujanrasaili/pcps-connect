import { useEffect } from "react";
import { applyBadge } from "../utils/titleBadge";

// Keeps the unread count at the front of the tab title. Pages set their own
// titles as the route changes, so a MutationObserver puts the count back each
// time (and stops when it matches, so it never loops). Removed on unmount, so
// logging out leaves a clean title.
export default function useTitleBadge(unread) {
  useEffect(() => {
    const el = document.querySelector("title");
    if (!el) return undefined;
    const apply = () => {
      const next = applyBadge(document.title, unread);
      if (next !== document.title) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(el, { childList: true, characterData: true, subtree: true });
    return () => {
      observer.disconnect();
      document.title = applyBadge(document.title, 0);
    };
  }, [unread]);
}
