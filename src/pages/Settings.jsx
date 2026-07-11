import { useState } from "react";
import { FaMoon, FaSun, FaBell, FaLock, FaUserShield, FaCheckCircle } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import Button from "../components/Button";

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [prefs, setPrefs] = useLocalStorage("pcps_notification_prefs", {
    eventReminders: true,
    clubUpdates: true,
    newsletter: false,
    smsAlerts: false,
  });
  const [saved, setSaved] = useState(false);

  const togglePref = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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
          <button type="button" className="flex w-full items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <FaLock className="text-primary-500" />
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-100">Change password</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">UI only — not connected to a backend.</p>
            </div>
          </button>
          <button type="button" className="flex w-full items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <FaUserShield className="text-primary-500" />
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-100">Privacy settings</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Control what other students can see.</p>
            </div>
          </button>
        </div>
      </div>
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
