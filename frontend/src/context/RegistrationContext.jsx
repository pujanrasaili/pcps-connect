import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getErrorMessage } from "../services/api";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

const RegistrationContext = createContext(null);

export function RegistrationProvider({ children }) {
  const { isAuthenticated, authChecked } = useAuth();
  const toast = useToast();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshRegistrations = useCallback(async () => {
    if (!isAuthenticated) {
      setRegistrations([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/registrations/my");
      setRegistrations(res.data.registrations);
    } catch {
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Load registrations once we know the login state (either just logged in,
  // or the page-load "am I logged in" check finished).
  useEffect(() => {
    if (authChecked) refreshRegistrations();
  }, [authChecked, isAuthenticated, refreshRegistrations]);

  const isRegistered = (eventId) =>
    isAuthenticated && registrations.some((r) => r.event?._id === eventId);

  const registerForEvent = async (eventId) => {
    if (!isAuthenticated) {
      toast.error("Please log in to register.");
      return { ok: false, message: "Please log in to register." };
    }
    try {
      await api.post("/registrations/register", { eventId });
      await refreshRegistrations();
      toast.success("You're registered for this event!");
      return { ok: true, message: "Registration successful!" };
    } catch (err) {
      const message = getErrorMessage(err, "Registration failed");
      toast.error(message);
      return { ok: false, message };
    }
  };

  // Accepts an eventId (what the rest of the UI already works with) and
  // looks up that registration's own _id internally, since the backend's
  // cancel route is keyed by the registration, not the event.
  const cancelRegistration = async (eventId) => {
    const registration = registrations.find((r) => r.event?._id === eventId);
    if (!registration) return { ok: false, message: "Registration not found" };
    try {
      await api.delete(`/registrations/${registration._id}`);
      await refreshRegistrations();
      toast.info("Unregistered from event.");
      return { ok: true };
    } catch (err) {
      const message = getErrorMessage(err, "Failed to cancel registration");
      toast.error(message);
      return { ok: false, message };
    }
  };

  return (
    <RegistrationContext.Provider
      value={{ registrations, loading, isRegistered, registerForEvent, cancelRegistration, refreshRegistrations }}
    >
      {children}
    </RegistrationContext.Provider>
  );
}

export const useRegistrations = () => useContext(RegistrationContext);
