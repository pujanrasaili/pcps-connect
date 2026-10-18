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
  const userId = isAuthenticated ? user?._id : null;
  const [state, setState] = useState({ forUser: null, clubs: [] });

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    api
      .get("/leader/clubs")
      .then((res) => !cancelled && setState({ forUser: userId, clubs: res.data.clubs || [] }))
      .catch(() => !cancelled && setState({ forUser: userId, clubs: [] }));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) return { clubs: [], loaded: true };
  const current = state.forUser === userId;
  return { clubs: current ? state.clubs : [], loaded: current };
}
