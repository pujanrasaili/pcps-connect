import { useSyncExternalStore } from "react";

// True while the browser window matches a CSS media query, and updates when it
// changes (rotating a phone, resizing the window). Used so only the layout
// that is actually visible mounts its components.
export function useMediaQuery(query) {
  const subscribe = (onChange) => {
    const mq = window.matchMedia?.(query);
    mq?.addEventListener?.("change", onChange);
    return () => mq?.removeEventListener?.("change", onChange);
  };
  const getSnapshot = () => !!window.matchMedia?.(query).matches;
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
