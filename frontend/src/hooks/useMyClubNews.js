import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

// The latest news posts from the clubs the logged-in student has joined:
// [{ _id, body, image, authorName, createdAt, editedAt, club: { _id, name } }].
// Empty until loaded, and if the request fails (it's a nice-to-have).
export function useMyClubNews() {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    api
      .get("/club-memberships/news")
      .then((res) => !cancelled && setPosts(res.data.posts || []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return posts;
}
