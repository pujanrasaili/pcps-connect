import { useEffect, useRef } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { getSaved, replaceSaved, watchSaved } from "../hooks/useSavedEvents";
import { mergeSaved, sameList, syncable } from "../utils/savedSync";

// Renders nothing. While someone is logged in, their "Save for later" list is
// loaded from their account and every change is sent back (after a short
// pause), so the list follows them to another device. Signed-out visitors keep
// the browser-only list; logging out clears it so the next person on a shared
// computer starts empty.
const OWNER_KEY = "pcps.savedEvents.owner";
const PAUSE_MS = 700;

const remember = (id) => {
  try {
    if (id) localStorage.setItem(OWNER_KEY, id);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    // Storage blocked: the list still syncs for this visit.
  }
};
const owner = () => {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
};

export default function SavedEventsSync() {
  const { user } = useAuth();
  const userId = user?._id || user?.id || null;
  const serverList = useRef([]);
  const ready = useRef(false);
  const timer = useRef(null);
  const wasLoggedIn = useRef(false);
  // The account's list as of the last load, read when the user changes.
  const loaded = user?.savedEvents;

  useEffect(() => {
    clearTimeout(timer.current);
    if (!userId) {
      ready.current = false;
      if (wasLoggedIn.current) {
        wasLoggedIn.current = false;
        replaceSaved([]);
        remember(null);
      }
      return undefined;
    }
    wasLoggedIn.current = true;
    ready.current = false;
    const server = Array.isArray(loaded) ? loaded : [];
    const merged = mergeSaved(getSaved(), server, owner() !== userId);
    const changed = !sameList(merged, server);
    serverList.current = merged;
    if (!sameList(getSaved(), merged)) replaceSaved(merged);
    remember(userId);
    ready.current = true;
    if (changed) {
      api.put("/auth/profile", { savedEvents: merged }).catch(() => {
        serverList.current = server;
      });
    }
    return undefined;
    // Only a different account should restart the sync, not every profile refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    return watchSaved(() => {
      if (!ready.current) return;
      const next = syncable(getSaved());
      if (sameList(next, serverList.current)) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const previous = serverList.current;
        serverList.current = next;
        api.put("/auth/profile", { savedEvents: next }).catch(() => {
          serverList.current = previous;
        });
      }, PAUSE_MS);
    });
  }, [userId]);

  useEffect(() => () => clearTimeout(timer.current), []);
  return null;
}
