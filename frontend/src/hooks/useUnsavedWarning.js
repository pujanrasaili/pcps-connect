import { useEffect } from "react";

// While `dirty` is true, closing or reloading the tab asks the browser to
// confirm first, so a half-written form isn't lost to a stray refresh. (The
// browser shows its own wording; pages can't customise it.)
export function useUnsavedWarning(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}
