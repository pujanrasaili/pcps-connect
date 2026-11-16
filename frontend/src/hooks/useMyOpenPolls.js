import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

// Open polls in the logged-in student's clubs that they have not voted on:
// [{ _id, question, closesAt, club: { _id, name } }]. Empty until loaded, and
// if the request fails (it's a nice-to-have).
export function useMyOpenPolls() {
  const { isAuthenticated } = useAuth();
  const [polls, setPolls] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    api
      .get("/club-memberships/polls")
      .then((res) => !cancelled && setPolls(res.data.polls || []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return polls;
}
