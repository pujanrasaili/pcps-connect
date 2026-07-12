import { createContext, useContext, useEffect, useState } from "react";
import { events } from "../data/events";
import { useAuth } from "./AuthContext";

const RegistrationContext = createContext(null);

const STORAGE_KEY = "pcps_registrations";

// Seed a couple of registrations so the dashboard has data on first load
const seedRegistrations = () => [
  {
    eventId: "web-dev-workshop",
    registeredAt: new Date().toISOString(),
    attended: true,
    name: "Prashant Dhakal",
    email: "prashant.dhakal@pcps.edu.np",
  },
  {
    eventId: "career-guidance-seminar",
    registeredAt: new Date().toISOString(),
    attended: false,
    name: "Prashant Dhakal",
    email: "prashant.dhakal@pcps.edu.np",
  },
];

export function RegistrationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [registrations, setRegistrations] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return seedRegistrations();
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations));
  }, [registrations]);

  // The underlying data always persists (so it's there again once the
  // student logs back in), but nothing is reported as "registered" to a
  // logged-out visitor -- otherwise anyone browsing the public site would
  // see a previous session's registrations.
  const isRegistered = (eventId) =>
    isAuthenticated && registrations.some((r) => r.eventId === eventId);

  const registerForEvent = (eventId, details) => {
    if (!isAuthenticated) return { ok: false, message: "Please log in to register." };
    if (isRegistered(eventId)) return { ok: false, message: "Already registered." };
    const event = events.find((e) => e.id === eventId);
    if (event && event.registered >= event.capacity) {
      return { ok: false, message: "This event is full." };
    }
    setRegistrations((prev) => [
      ...prev,
      {
        eventId,
        registeredAt: new Date().toISOString(),
        attended: false,
        ...details,
      },
    ]);
    return { ok: true, message: "Registration successful!" };
  };

  const cancelRegistration = (eventId) => {
    setRegistrations((prev) => prev.filter((r) => r.eventId !== eventId));
  };

  return (
    <RegistrationContext.Provider
      value={{
        registrations: isAuthenticated ? registrations : [],
        isRegistered,
        registerForEvent,
        cancelRegistration,
      }}
    >
      {children}
    </RegistrationContext.Provider>
  );
}

export const useRegistrations = () => useContext(RegistrationContext);
