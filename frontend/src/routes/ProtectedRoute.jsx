import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, authChecked } = useAuth();
  const location = useLocation();

  // Wait for the initial "am I logged in?" check to finish before deciding
  // to redirect -- otherwise a logged-in student gets bounced to /login for
  // a split second on every page refresh, since isAuthenticated starts
  // false until that check resolves.
  if (!authChecked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
