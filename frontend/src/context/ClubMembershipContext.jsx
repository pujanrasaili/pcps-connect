import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getErrorMessage } from "../services/api";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

const ClubMembershipContext = createContext(null);

export function ClubMembershipProvider({ children }) {
  const { isAuthenticated, authChecked, user, refreshUser } = useAuth();
  const toast = useToast();
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshMemberships = useCallback(async () => {
    if (!isAuthenticated) {
      setMemberships([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/club-memberships/my");
      setMemberships(res.data.memberships);
    } catch {
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authChecked) refreshMemberships();
  }, [authChecked, isAuthenticated, refreshMemberships]);

  const isJoined = (clubId) =>
    isAuthenticated && memberships.some((m) => m.club?._id === clubId);

  // Favorite lives on the user's own account (User.favoriteClub), fully
  // independent of ClubMembership -- favoriting a club never implies
  // joining it, and vice versa.
  const favoriteClubId = user?.favoriteClub || null;
  const isFavorite = (clubId) => isAuthenticated && favoriteClubId === clubId;

  const joinClub = async (clubId) => {
    if (!isAuthenticated) return;
    try {
      await api.post("/club-memberships/join", { clubId });
      await refreshMemberships();
      toast.success("Joined club!");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to join club"));
    }
  };

  const leaveClub = async (clubId) => {
    if (!isAuthenticated) return;
    try {
      await api.delete(`/club-memberships/${clubId}`);
      await refreshMemberships();
      toast.info("Left club.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to leave club"));
    }
  };

  const toggleJoin = async (clubId) => {
    if (!isAuthenticated) return;
    if (isJoined(clubId)) {
      await leaveClub(clubId);
    } else {
      await joinClub(clubId);
    }
  };

  const toggleFavorite = async (clubId) => {
    if (!isAuthenticated) return;
    try {
      const wasFavorite = isFavorite(clubId);
      await api.put("/auth/favorite-club", { clubId });
      await refreshUser();
      toast.success(wasFavorite ? "Removed from favorites." : "Set as your favorite club!");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update favorite"));
    }
  };

  return (
    <ClubMembershipContext.Provider
      value={{
        memberships,
        loading,
        favoriteClubId,
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
