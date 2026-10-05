import { useState } from "react";
import { FaMoon, FaSun, FaBell, FaLock, FaCheckCircle } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import Button from "../components/Button";
import Modal from "../components/Modal";

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { changePassword } = useAuth();
  const toast = useToast();
  const [prefs, setPrefs] = useLocalStorage("pcps_notification_prefs", {
    eventReminders: true,
    clubUpdates: true,
    newsletter: false,
    smsAlerts: false,
  });
  const [saved, setSaved] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const togglePref = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePwChange = (e) => {
    const { name, value } = e.target;
    setPwForm((prev) => ({ ...prev, [name]: value }));
  };

  const closePwModal = () => {
    setPwOpen(false);
    setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPwError("");
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    setPwError("");

    if (pwForm.newPassword.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }

    setPwSaving(true);
    const result = await changePassword(pwForm.currentPassword, pwForm.newPassword);
    setPwSaving(false);

    if (!result.ok) {
      setPwError(result.message);
      return;
    }
    toast.success("Password changed successfully.");
    closePwModal();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage how PCPS Connect looks and talks to you.</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <FaCheckCircle /> Preferences saved.
        </div>
      )}

      <div className="card-surface p-6">
        <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">Appearance</h2>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 p-4">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <FaMoon className="text-primary-500" /> : <FaSun className="text-primary-500" />}
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-100">Dark mode</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Switch between light and dark themes.
              </p>
            </div>
          </div>
          <ToggleSwitch checked={theme === "dark"} onChange={toggleTheme} label="Toggle dark mode" />
        </div>
      </div>

      <form onSubmit={handleSave} className="card-surface p-6">
        <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
          Notification Preferences
        </h2>
        <div className="mt-4 space-y-3">
          <PrefRow
            icon={FaBell}
            title="Event reminders"
            desc="Get notified before events you registered for."
            checked={prefs.eventReminders}
            onChange={() => togglePref("eventReminders")}
          />
          <PrefRow
            icon={FaBell}
            title="Club updates"
            desc="News and announcements from your joined clubs."
            checked={prefs.clubUpdates}
            onChange={() => togglePref("clubUpdates")}
          />
          <PrefRow
            icon={FaBell}
            title="Monthly newsletter"
            desc="A monthly digest of campus highlights."
            checked={prefs.newsletter}
            onChange={() => togglePref("newsletter")}
          />
          <PrefRow
            icon={FaBell}
            title="SMS alerts"
            desc="Text message alerts for urgent updates."
            checked={prefs.smsAlerts}
            onChange={() => togglePref("smsAlerts")}
          />
        </div>
        <Button type="submit" className="mt-5">Save preferences</Button>
      </form>

      <div className="card-surface p-6">
        <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">Account</h2>
        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => setPwOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <FaLock className="text-primary-500" />
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-100">Change password</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Update the password you use to log in.</p>
            </div>
          </button>
        </div>
      </div>

      <Modal isOpen={pwOpen} onClose={closePwModal} title="Change password" size="sm">
        <form onSubmit={handlePwSubmit} className="space-y-4">
          {pwError && (
            <p className="rounded-lg bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
              {pwError}
            </p>
          )}
          <div>
            <label className="label-field" htmlFor="current-password">Current password</label>
            <input
              id="current-password"
              name="currentPassword"
              type="password"
              className="input-field"
              value={pwForm.currentPassword}
              onChange={handlePwChange}
              required
            />
          </div>
          <div>
            <label className="label-field" htmlFor="new-password">New password</label>
            <input
              id="new-password"
              name="newPassword"
              type="password"
              className="input-field"
              value={pwForm.newPassword}
              onChange={handlePwChange}
              required
            />
          </div>
          <div>
            <label className="label-field" htmlFor="confirm-new-password">Confirm new password</label>
            <input
              id="confirm-new-password"
              name="confirmPassword"
              type="password"
              className="input-field"
              value={pwForm.confirmPassword}
              onChange={handlePwChange}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={pwSaving}>
            {pwSaving ? "Changing..." : "Change password"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function PrefRow({ icon: Icon, title, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 p-4">
      <div className="flex items-center gap-3">
        <Icon className="text-primary-500" />
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">{title}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{desc}</p>
        </div>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} label={`Toggle ${title}`} />
    </div>
  );
}

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-7 w-[52px] shrink-0 rounded-full border transition-colors duration-200 ${
        checked
          ? "border-primary-500 bg-primary-500"
          : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
      }`}
    >
      <span
        className={`absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? "translate-x-[26px]" : "translate-x-0.5"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${checked ? "bg-primary-500" : "bg-slate-300"}`}
        />
      </span>
    </button>
  );
}
