import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Same wait-for-auth-check pattern as ProtectedRoute, plus a role check.
// A logged-in student who isn't an admin gets sent home rather than to
// /login (they ARE logged in, they're just not allowed here).
export default function AdminRoute({ children }) {
  const { isAuthenticated, authChecked, user } = useAuth();
  const location = useLocation();

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

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}
