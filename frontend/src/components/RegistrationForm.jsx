import { useState } from "react";
import { FaCheckCircle, FaUser, FaEnvelope } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useRegistrations } from "../context/RegistrationContext";
import Button from "./Button";

export default function RegistrationForm({ event, onSuccess }) {
  const { user } = useAuth();
  const { registerForEvent, isRegistered, isPending } = useRegistrations();
  const [submitting, setSubmitting] = useState(false);

  const alreadyRegistered = isRegistered(event._id);
  const needsApproval = !!event.requiresApproval;

  const handleConfirm = async () => {
    setSubmitting(true);
    const result = await registerForEvent(event._id);
    setSubmitting(false);

    if (result.ok) onSuccess?.();
  };

  if (alreadyRegistered) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <FaCheckCircle className="text-4xl text-emerald-500" />
        <p className="font-semibold text-slate-800 dark:text-slate-100">
          {isPending(event._id) ? "Your request is already with the organisers." : "You're already registered for this event."}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Check your dashboard for details and updates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {needsApproval
          ? "The organisers approve each person who joins this event. Your request will be sent using your PCPS Connect account details, and a seat is held for you while they decide:"
          : "You'll be registered using your PCPS Connect account details:"}
      </p>

      <div className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4">
        <p className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
          <FaUser className="text-primary-500" /> {user?.name}
        </p>
        <p className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
          <FaEnvelope className="text-primary-500" /> {user?.email}
        </p>
      </div>

      <Button onClick={handleConfirm} className="w-full" disabled={submitting}>
        {submitting ? (needsApproval ? "Sending request..." : "Registering...") : needsApproval ? "Send request" : "Confirm registration"}
      </Button>
    </div>
  );
}
