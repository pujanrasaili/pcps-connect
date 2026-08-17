import { createContext, useContext, useEffect, useState } from "react";
import { api, getErrorMessage } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // "checking" -- true only during the initial page-load auth check, so the
  // rest of the app can avoid flashing a logged-out state before we know.
  const [authChecked, setAuthChecked] = useState(false);

  // On first load, ask the backend "am I still logged in?" -- the JWT
  // lives in an httpOnly cookie, so JavaScript can't read it directly;
  // this is the only way to know.
  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      try {
        const res = await api.get("/auth/me");
        if (!cancelled) {
          setUser(res.data.user);
          setIsAuthenticated(true);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    }
    checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      setUser(res.data.user);
      setIsAuthenticated(true);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: getErrorMessage(err, "Login failed") };
    }
  };

  const register = async (data) => {
    try {
      const res = await api.post("/auth/register", data);
      // Registration doesn't log the student in automatically on the
      // backend (no cookie is set by /register) -- log in right after
      // with the same credentials so the flow feels seamless.
      const loginResult = await login(data.email, data.password);
      if (!loginResult.ok) {
        // Registered successfully but auto-login failed for some reason --
        // still a success from the user's point of view, just ask them to
        // log in manually.
        return { ok: true, user: res.data.user, requiresManualLogin: true };
      }
      return { ok: true, user: res.data.user };
    } catch (err) {
      return { ok: false, message: getErrorMessage(err, "Registration failed") };
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Even if the request fails, clear local state so the UI reflects
      // "logged out" -- the cookie will simply expire on its own.
    }
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = async (updates) => {
    try {
      const res = await api.put("/auth/profile", updates);
      setUser(res.data.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: getErrorMessage(err, "Failed to update profile") };
    }
  };

  // Re-fetches the current user from the backend and updates local state --
  // used after actions that change the user record from elsewhere (e.g.
  // toggling a favorite club) without going through updateUser/login.
  const refreshUser = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: getErrorMessage(err) };
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, authChecked, login, register, logout, updateUser, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
