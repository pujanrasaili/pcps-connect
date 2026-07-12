import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Returns a `requireAuth(action)` wrapper: runs `action()` immediately if
 * the student is logged in, otherwise redirects to /login and remembers
 * the current page so they land back here after signing in.
 */
export function useRequireAuth() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return function requireAuth(action) {
    if (isAuthenticated) {
      action();
    } else {
      navigate("/login", { state: { from: location.pathname } });
    }
  };
}
