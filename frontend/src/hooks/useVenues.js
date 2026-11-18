import { useEffect, useState } from "react";
import { api } from "../services/api";
import { sharedRequest } from "../utils/sharedRequest";

// The campus venues (name + directions), for the event page and the event form.
// A nicety: while loading, or if the request fails, the list is just empty.
export function useVenues() {
  const [venues, setVenues] = useState([]);
  useEffect(() => {
    let cancelled = false;
    sharedRequest("venues", () => api.get("/venues", { quiet: true }), 30000)
      .then((res) => !cancelled && setVenues(res.data.venues || []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return venues;
}
