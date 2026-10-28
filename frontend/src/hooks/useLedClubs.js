import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

// The clubs this person has been named a leader of (empty for most students,
// and for admins who aren't also leaders). `loaded` lets route guards wait
// instead of bouncing a leader home while the request is still in flight.
// Results are tagged with the user they were fetched for, so the moment the
// logged-in user changes (login, logout, page load) `loaded` is false again
// until the new answer arrives -- never a stale "no clubs".
export function useLedClubs() {
  const { user, isAuthenticated } = useAuth();
  // The API's public user object exposes the id as `id` (not `_id`).
  const userId = isAuthenticated ? user?.id ?? user?._id ?? null : null;
  const [state, setState] = useState({ forUser: null, clubs: [], failed: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    api
      .get("/leader/clubs")
      .then((res) => !cancelled && setState({ forUser: userId, clubs: res.data.clubs || [], failed: false }))
      .catch(() => !cancelled && setState({ forUser: userId, clubs: [], failed: true }));
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  if (!userId) return { clubs: [], loaded: true, failed: false, retry: () => {} };
  const current = state.forUser === userId;
  return {
    clubs: current ? state.clubs : [],
    loaded: current,
    failed: current && state.failed,
    retry: () => setAttempt((n) => n + 1),
  };
}
