import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Storage can throw (private windows, blocked site data) -- fall back to the system theme.
    let saved = null;
    try {
      saved = localStorage.getItem("pcps_theme");
    } catch {
      saved = null;
    }
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    // The phone's status bar (and the title bar of the installed app) follows the theme.
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#020617" : "#1B4FA0");
    try {
      localStorage.setItem("pcps_theme", theme);
    } catch {
      // Not persisting the choice is fine; it still applies for this visit.
    }
  }, [theme]);

  // Dark pages would print as pale text on white paper. While the print dialog
  // is open, show the light colours, then put the person's theme back.
  useEffect(() => {
    const root = window.document.documentElement;
    const before = () => root.classList.remove("dark");
    const after = () => root.classList.toggle("dark", theme === "dark");
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
