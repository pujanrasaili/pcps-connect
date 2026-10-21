import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getErrorMessage } from "../services/api";

const ClubsContext = createContext(null);

export function ClubsProvider({ children }) {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshClubs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/clubs");
      setClubs(res.data.clubs);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load clubs"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshClubs();
  }, [refreshClubs]);

  // Keeps the public member count in step when the logged-in student joins or
  // leaves, without refetching (and flashing the list's loading spinner).
  const adjustMemberCount = useCallback((clubId, delta) => {
    setClubs((prev) =>
      prev.map((c) => (c._id === clubId && typeof c.memberCount === "number" ? { ...c, memberCount: Math.max(0, c.memberCount + delta) } : c))
    );
  }, []);

  const getClubById = useCallback(
    async (id) => {
      const cached = clubs.find((c) => c._id === id);
      if (cached) return cached;
      try {
        const res = await api.get(`/clubs/${id}`);
        return res.data.club;
      } catch {
        return null;
      }
    },
    [clubs]
  );

  return (
    <ClubsContext.Provider value={{ clubs, loading, error, refreshClubs, getClubById, adjustMemberCount }}>
      {children}
    </ClubsContext.Provider>
  );
}

export const useClubs = () => useContext(ClubsContext);
