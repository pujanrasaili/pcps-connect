import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../services/api";

const REFRESH_MS = 2 * 60 * 1000;

// The logged-in student's in-app notifications for the bell in the top bar.
// Refreshes on a slow timer while the tab is visible and when the tab is
// focused again; failures are silent (the bell just keeps what it had), and the
// requests are `quiet` so they never raise the "server is waking up" notice.
export function useNotifications(enabled) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications", { quiet: true });
      if (!mounted.current) return null;
      const list = Array.isArray(data?.notifications) ? data.notifications : [];
      setItems(list);
      setUnread(Number(data?.unreadCount) || 0);
      return list;
    } catch {
      return null;
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.put("/notifications/read-all", null, { quiet: true });
      if (!mounted.current) return;
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* try again next time the bell is opened */
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) return undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const tick = () => document.visibilityState === "visible" && load();
    const timer = setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [enabled, load]);

  return { items: enabled ? items : [], unread: enabled ? unread : 0, load, markAllRead };
}
