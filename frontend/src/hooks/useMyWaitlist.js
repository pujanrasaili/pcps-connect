import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

// The upcoming events the logged-in student is waitlisted for, with their
// place in line: [{ event: { _id, title, date, location }, position }].
// Empty until loaded, and if the request fails (it's a nice-to-have).
export function useMyWaitlist() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    api
      .get("/waitlist/my")
      .then((res) => !cancelled && setItems(res.data.waitlist || []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return items;
}
