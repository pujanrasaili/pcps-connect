// Decides whether a decorative background video may start by itself.
// It shouldn't for people who asked the browser to save data, who are on a
// slow connection (a multi-megabyte reel would eat their data plan and delay
// the page), or who prefer reduced motion. They still see the poster image
// and can press play to watch it.
const SLOW_CONNECTIONS = ["slow-2g", "2g", "3g"];

export function shouldAutoplayVideo({ reducedMotion = false, saveData = false, effectiveType = "" } = {}) {
  if (reducedMotion || saveData) return false;
  return !SLOW_CONNECTIONS.includes(effectiveType);
}

// Reads the live browser settings (all optional: unsupported means allowed).
export function browserAllowsAutoplay() {
  if (typeof window === "undefined") return false;
  const connection = navigator.connection || {};
  return shouldAutoplayVideo({
    reducedMotion: !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    saveData: !!connection.saveData,
    effectiveType: connection.effectiveType || "",
  });
}
