import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

// The upcoming events the logged-in student signed up to help at:
// [{ event: { _id, title, date, location }, role }]. Empty until loaded, and if
// the request fails (it's a nice-to-have).
export function useMyVolunteering() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    api
      .get("/events/volunteering/mine")
      .then((res) => !cancelled && setItems(Array.isArray(res.data?.volunteering) ? res.data.volunteering : []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return items;
}
