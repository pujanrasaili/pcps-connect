import { useCallback, useSyncExternalStore } from "react";
import { SAVED_KEY, parseSaved, toggleSaved } from "../utils/savedEvents";

// One shared list so every card updates together (and other tabs too).
let current = null;
const listeners = new Set();

function load() {
  try {
    return parseSaved(localStorage.getItem(SAVED_KEY));
  } catch {
    return [];
  }
}

function getSnapshot() {
  if (current === null) current = load();
  return current;
}

function emit(next) {
  current = next;
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the list still works until the page is closed.
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn) {
  listeners.add(fn);
  const onStorage = (e) => {
    if (e.key === SAVED_KEY || e.key === null) {
      current = load();
      fn();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSavedEvents() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, () => []);
  const isSaved = useCallback((id) => ids.includes(id), [ids]);
  const toggle = useCallback((id) => emit(toggleSaved(getSnapshot(), id)), []);
  return { savedIds: ids, isSaved, toggle };
}
