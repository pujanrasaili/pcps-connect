import { useState } from "react";
import { FaCheckCircle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useRegistrations } from "../context/RegistrationContext";
import Button from "./Button";

export default function RegistrationForm({ event, onSuccess }) {
  const { user } = useAuth();
  const { registerForEvent, isRegistered } = useRegistrations();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    note: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);

  const alreadyRegistered = isRegistered(event.id);

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Full name is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address.";
    if (!form.phone.trim()) next.phone = "Phone number is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const result = registerForEvent(event.id, form);
    setStatus(result);
    if (result.ok) {
      setTimeout(() => onSuccess?.(), 900);
    }
  };

  if (alreadyRegistered) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <FaCheckCircle className="text-4xl text-emerald-500" />
        <p className="font-semibold text-slate-800 dark:text-slate-100">
          You're already registered for this event.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Check your dashboard for details and updates.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="reg-name" className="label-field">
          Full name
        </label>
        <input
          id="reg-name"
          type="text"
          className="input-field"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="reg-email" className="label-field">
          Email address
        </label>
        <input
          id="reg-email"
          type="email"
          className="input-field"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="reg-phone" className="label-field">
          Phone number
        </label>
        <input
          id="reg-phone"
          type="tel"
          className="input-field"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>}
      </div>

      <div>
        <label htmlFor="reg-note" className="label-field">
          Note (optional)
        </label>
        <textarea
          id="reg-note"
          rows={3}
          className="input-field resize-none"
          placeholder="Dietary needs, accessibility requests, etc."
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
      </div>

      {status && !status.ok && (
        <p className="text-sm font-medium text-rose-500">{status.message}</p>
      )}

      <Button type="submit" className="w-full">
        Confirm registration
      </Button>
    </form>
  );
}
