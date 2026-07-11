import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const DEFAULT_STUDENT = {
  id: "stu-2026-041",
  name: "Prashant Dhakal",
  email: "prashant.dhakal@pcps.edu.np",
  studentId: "PCPS-BSC_SE-2026-041",
  program: "BSc (Hons) Software Engineering",
  semester: "4th Semester",
  avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Prashant%20Dhakal&backgroundColor=4F46E5",
  phone: "+977 9841326574",
  joinedClubs: ["coding-club", "photography-club"],
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("pcps_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem("pcps_auth") === "true"
  );

  useEffect(() => {
    if (user) localStorage.setItem("pcps_user", JSON.stringify(user));
  }, [user]);

  const login = (email) => {
    const loggedInUser = { ...DEFAULT_STUDENT, email: email || DEFAULT_STUDENT.email };
    setUser(loggedInUser);
    setIsAuthenticated(true);
    localStorage.setItem("pcps_auth", "true");
    localStorage.setItem("pcps_user", JSON.stringify(loggedInUser));
  };

  const register = (data) => {
    const newUser = {
      ...DEFAULT_STUDENT,
      name: data.name || DEFAULT_STUDENT.name,
      email: data.email || DEFAULT_STUDENT.email,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        data.name || "Student"
      )}&backgroundColor=4F46E5`,
    };
    setUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem("pcps_auth", "true");
    localStorage.setItem("pcps_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("pcps_auth");
  };

  const updateUser = (updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, login, register, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
