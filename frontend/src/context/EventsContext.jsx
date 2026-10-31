import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getErrorMessage } from "../services/api";

const EventsContext = createContext(null);

export function EventsProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/events");
      setEvents(res.data.events || []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load events"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

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
    <EventsContext.Provider value={{ events, loading, error, refreshEvents, getEventById }}>
      {children}
    </EventsContext.Provider>
  );
}

export const useEvents = () => useContext(EventsContext);
