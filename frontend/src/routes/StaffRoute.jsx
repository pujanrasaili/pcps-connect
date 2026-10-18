import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLedClubs } from "../hooks/useLedClubs";

// Admins, plus students an admin has made a club leader. Leaders only reach
// the event and check-in pages; everything else stays behind AdminRoute. The
// server enforces the same rule, this just keeps people off dead-end pages.
export default function StaffRoute({ children }) {
  const { isAuthenticated, authChecked, user } = useAuth();
  const { clubs, loaded } = useLedClubs();
  const location = useLocation();

  if (!authChecked || (isAuthenticated && user?.role !== "admin" && !loaded)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }
  if (user?.role !== "admin" && clubs.length === 0) return <Navigate to="/" replace />;
  return children;
}
