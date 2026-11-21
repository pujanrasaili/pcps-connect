import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { api, getErrorMessage } from "../services/api";

const EventsContext = createContext(null);

const STALE_AFTER_MS = 5 * 60 * 1000;

const fetchList = (scope) => api.get("/events", scope === "all" ? { params: { scope: "all" } } : undefined);

export function EventsProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadedAt = useRef(Date.now());
  // The server sends upcoming events and the last 90 days. Pages that need the
  // whole history call loadAllEvents(); after that, every refresh asks for all.
  const scope = useRef("recent");
  const [loadingOlder, setLoadingOlder] = useState(false);

  const refreshEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchList(scope.current);
      setEvents(res.data.events || []);
      loadedAt.current = Date.now();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load events"));
    } finally {
      setLoading(false);
    }
  }, []);

  // A tab left open for hours (a phone put in a pocket) shows seat counts from
  // when it was loaded. When the person comes back after a while, fetch quietly
  // -- no spinner, and an error here keeps the old list rather than replacing it.
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - loadedAt.current < STALE_AFTER_MS) return;
      loadedAt.current = Date.now();
      try {
        const res = await fetchList(scope.current);
        setEvents(res.data.events || []);
      } catch {
        loadedAt.current = 0;
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  // Fetches every event ever, once. The list on screen stays until the full one
  // arrives; if the request fails the person keeps the recent events and the next
  // call tries again.
  const loadAllEvents = useCallback(async () => {
    if (scope.current === "all") return;
    scope.current = "all";
    setLoadingOlder(true);
    try {
      const res = await api.get("/events", { params: { scope: "all" } });
      // A reply without a list is no answer: keep what is on screen.
      if (!Array.isArray(res.data?.events)) throw new Error("No event list in the reply");
      setEvents(res.data.events);
      loadedAt.current = Date.now();
    } catch {
      scope.current = "recent";
    } finally {
      setLoadingOlder(false);
    }
  }, []);

  // Looks up an event by id from the already-loaded list first (instant,
  // no network call). Falls back to fetching it individually -- covers
  // someone opening an event detail link directly before the full list
  // has loaded.
  const getEventById = useCallback(
    async (id) => {
      const cached = events.find((e) => e._id === id);
      if (cached) return cached;
      try {
        const res = await api.get(`/events/${id}`);
        return res.data.event;
      } catch (err) {
        // "No such event" (404, or an id that isn't valid) is an answer; a
        // dead connection or a broken server is not, and must not look like one.
        const status = err?.response?.status;
        if (status === 404 || status === 400) return null;
        throw err;
      }
    },
    [events]
  );

  return (
    <EventsContext.Provider value={{ events, loading, loadingOlder, error, refreshEvents, loadAllEvents, getEventById }}>
      {children}
    </EventsContext.Provider>
  );
}

export const useEvents = () => useContext(EventsContext);
