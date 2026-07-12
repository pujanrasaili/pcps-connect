import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const ClubMembershipContext = createContext(null);

const JOINED_KEY = "pcps_joined_clubs";
const FAVORITE_KEY = "pcps_favorite_club";

export function ClubMembershipProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [joinedClubIds, setJoinedClubIds] = useState(() => {
    const saved = localStorage.getItem(JOINED_KEY);
    return saved ? JSON.parse(saved) : ["coding-club", "photography-club"];
  });
  const [favoriteClubId, setFavoriteClubId] = useState(() => {
    return localStorage.getItem(FAVORITE_KEY) || "coding-club";
  });

  useEffect(() => {
    localStorage.setItem(JOINED_KEY, JSON.stringify(joinedClubIds));
  }, [joinedClubIds]);

  useEffect(() => {
    if (favoriteClubId) {
      localStorage.setItem(FAVORITE_KEY, favoriteClubId);
    } else {
      localStorage.removeItem(FAVORITE_KEY);
    }
  }, [favoriteClubId]);

  // Same rule as registrations: the data persists underneath, but a
  // logged-out visitor never sees a "joined"/"favorite" state that
  // belongs to whoever was last signed in on this browser.
  const isJoined = (clubId) => isAuthenticated && joinedClubIds.includes(clubId);
  const isFavorite = (clubId) => isAuthenticated && favoriteClubId === clubId;

  const joinClub = (clubId) => {
    if (!isAuthenticated) return;
    setJoinedClubIds((prev) => (prev.includes(clubId) ? prev : [...prev, clubId]));
  };

  const leaveClub = (clubId) => {
    if (!isAuthenticated) return;
    setJoinedClubIds((prev) => prev.filter((id) => id !== clubId));
    setFavoriteClubId((prev) => (prev === clubId ? null : prev));
  };

  const toggleJoin = (clubId) => {
    if (!isAuthenticated) return;
    if (isJoined(clubId)) {
      leaveClub(clubId);
    } else {
      joinClub(clubId);
    }
  };

  const toggleFavorite = (clubId) => {
    if (!isAuthenticated) return;
    // Favoriting is just a bookmark -- it no longer forces membership.
    setFavoriteClubId((prev) => (prev === clubId ? null : clubId));
  };

  return (
    <ClubMembershipContext.Provider
      value={{
        joinedClubIds: isAuthenticated ? joinedClubIds : [],
        favoriteClubId: isAuthenticated ? favoriteClubId : null,
        isJoined,
        isFavorite,
        joinClub,
        leaveClub,
        toggleJoin,
        toggleFavorite,
      }}
    >
      {children}
    </ClubMembershipContext.Provider>
  );
}

export const useClubMembership = () => useContext(ClubMembershipContext);
