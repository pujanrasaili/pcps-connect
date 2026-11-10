import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PasswordInput from "../components/PasswordInput";
import { FaMoon, FaSun, FaBell, FaLock, FaCheckCircle, FaTrashAlt, FaDownload } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { useToast } from "../context/ToastContext";
import Button from "../components/Button";
import Modal from "../components/Modal";
import { api, getErrorMessage } from "../services/api";
import { downloadJson } from "../utils/downloadJson";
import { usePushAlerts } from "../hooks/usePushAlerts";

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { user, changePassword, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLang();
  const toast = useToast();
  const [saved, setSaved] = useState(false);
  const [savingPref, setSavingPref] = useState(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const push = usePushAlerts();
  const handlePushToggle = async () => {
    if (push.on) {
      const result = await push.turnOff();
      if (result === "error") toast.error(t("Couldn't turn off alerts on this device"));
      else toast.success(t("Alerts are off for this device."));
      return;
    }
    const result = await push.turnOn();
    if (result === "on") toast.success(t("Alerts are on for this device."));
    else if (result === "blocked") toast.error(t("Alerts are blocked in your browser's settings for this site."));
    else toast.error(t("Couldn't turn on alerts on this device"));
  };

  const [testing, setTesting] = useState(false);
  const handleTestAlert = async () => {
    setTesting(true);
    try {
      const { data } = await api.post("/push/test");
      toast.success(t(data?.message || "Test alert sent. It should pop up in a moment."));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't send a test alert")));
    } finally {
      setTesting(false);
    }
  };

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get("/auth/export");
      downloadJson("pcps-connect-my-data.json", res.data);
      toast.success(t("Your data was downloaded."));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't download your data")));
    } finally {
      setExporting(false);
    }
  };

  // Deleting your own account (students only -- admins are removed by another admin).
  const [delOpen, setDelOpen] = useState(false);
  const [delPassword, setDelPassword] = useState("");
  const [delError, setDelError] = useState("");
  const [delBusy, setDelBusy] = useState(false);

  const closeDelModal = () => {
    setDelOpen(false);
    setDelPassword("");
    setDelError("");
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setDelBusy(true);
    setDelError("");
    try {
      await api.delete("/auth/account", { data: { password: delPassword } });
      // Leave this protected page first, otherwise logging out bounces to /login.
      navigate("/", { replace: true });
      await logout();
      toast.success(t("Your account has been deleted."));
    } catch (err) {
      setDelError(getErrorMessage(err, t("Couldn't delete your account")));
      setDelBusy(false);
    }
  };

  // Both toggles mirror real fields on the user record that the backend acts
  // on (eventReminders -> scripts/sendEventReminders.js, clubUpdates ->
  // utils/notifyClubMembers.js and scripts/sendWeeklyDigest.js). Saved immediately on toggle rather than
  // batched, so what's on screen always reflects what the server will do.
  const handleTogglePref = async (key) => {
    setSavingPref(key);
    const result = await updateUser({ [key]: !(user?.[key] !== false) });
    setSavingPref(null);
    if (!result.ok) {
      toast.error(result.message || t("Failed to update preference"));
      return;
    }
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

    if (pwForm.newPassword.length < 8) {
      setPwError(t("New password must be at least 8 characters."));
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError(t("New passwords do not match."));
      return;
    }

    setPwSaving(true);
    const result = await changePassword(pwForm.currentPassword, pwForm.newPassword);
    setPwSaving(false);

    if (!result.ok) {
      setPwError(result.message);
      return;
    }
    toast.success(t("Password changed successfully."));
    closePwModal();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">{t("Settings")}</h1>
        <p className="text-slate-500 dark:text-slate-400">{t("Manage how PCPS Connect looks and talks to you.")}</p>
      </div>

      {/* The live region itself is always on the page; only its content
          comes and goes, which is what makes screen readers announce it. */}
      <div role="status">
        {saved && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <FaCheckCircle className="shrink-0" aria-hidden="true" /> {t("Preferences saved.")}
          </div>
        )}
      </div>

      <div className="card-surface p-6">
        <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">{t("Appearance")}</h2>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 p-4">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <FaMoon className="shrink-0 text-primary-500" /> : <FaSun className="shrink-0 text-primary-500" />}
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-100">{t("Dark mode")}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("Switch between light and dark themes.")}
              </p>
            </div>
          </div>
          <ToggleSwitch checked={theme === "dark"} onChange={toggleTheme} label={t("Toggle dark mode")} />
        </div>
      </div>

      <div className="card-surface p-6">
        <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
          {t("Notification Preferences")}
        </h2>
        <div className="mt-4 space-y-3">
          <PrefRow
            icon={FaBell}
            title="Event reminders"
            desc="Get an email before events you registered for."
            checked={user?.eventReminders !== false}
            onChange={() => handleTogglePref("eventReminders")}
            disabled={savingPref === "eventReminders"}
          />
          <PrefRow
            icon={FaBell}
            title="Club updates"
            desc="Get an email when a club you've joined announces a new event, plus a short weekly summary of what your clubs have planned."
            checked={user?.clubUpdates !== false}
            onChange={() => handleTogglePref("clubUpdates")}
            disabled={savingPref === "clubUpdates"}
          />
          {push.available && (
            <PrefRow
              icon={FaBell}
              title="Alerts on this device"
              desc="Pop up bell messages (event changes, approvals, reminders) on this phone or browser, even when the site is closed. Each device is switched on separately."
              checked={push.on}
              onChange={handlePushToggle}
              disabled={push.busy}
            />
          )}
          {push.available && push.on && (
            <div className="px-1">
              <Button type="button" variant="secondary" onClick={handleTestAlert} disabled={testing}>
                {t("Send a test alert")}
              </Button>
            </div>
          )}
        </div>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          {t("Emails from PCPS Connect, like password resets and event reminders, are written in the language you last used on the site.")}
        </p>
      </div>

      <div className="card-surface p-6">
        <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">{t("Account")}</h2>
        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => setPwOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <FaLock className="shrink-0 text-primary-500" />
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-100">{t("Change password")}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("Update the password you use to log in.")}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-60"
          >
            <FaDownload className="shrink-0 text-primary-500" />
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-100">{exporting ? t("Preparing...") : t("Download my data")}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("A file with your profile, registrations, ratings and club memberships.")}
              </p>
            </div>
          </button>
          {user?.role !== "admin" && (
            <button
              type="button"
              onClick={() => setDelOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl border border-rose-100 p-4 text-left transition-colors hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-900/10"
            >
              <FaTrashAlt className="shrink-0 text-rose-500" />
              <div>
                <p className="font-medium text-rose-700 dark:text-rose-400">{t("Delete account")}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("Permanently remove your account, registrations and club memberships.")}
                </p>
              </div>
            </button>
          )}
        </div>
      </div>

      <Modal isOpen={delOpen} onClose={closeDelModal} title={t("Delete your account?")} size="sm">
        <form onSubmit={handleDelete} className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("This permanently deletes your account, your event registrations (including certificates and ratings) and your club memberships. Any upcoming events you created are cancelled and the students registered for them are told. It can't be undone.")}
          </p>
          {delError && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
              {delError}
            </p>
          )}
          <div>
            <label className="label-field" htmlFor="delete-password">{t("Enter your password to confirm")}</label>
            <input
              data-autofocus
              id="delete-password"
              type="password"
              className="input-field"
              value={delPassword}
              onChange={(e) => setDelPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={delBusy || !delPassword}
            className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
          >
            {delBusy ? t("Deleting...") : t("Delete my account")}
          </button>
        </form>
      </Modal>

      <Modal isOpen={pwOpen} onClose={closePwModal} title={t("Change password")} size="sm">
        <form onSubmit={handlePwSubmit} className="space-y-4">
          {pwError && (
            <p role="alert" className="rounded-lg bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-400">
              {pwError}
            </p>
          )}
          <div>
            <label className="label-field" htmlFor="current-password">{t("Current password")}</label>
            <PasswordInput data-autofocus id="current-password" name="currentPassword" value={pwForm.currentPassword} onChange={handlePwChange} autoComplete="current-password" required />
          </div>
          <div>
            <label className="label-field" htmlFor="new-password">{t("New password")}</label>
            <PasswordInput id="new-password" name="newPassword" maxLength={72} value={pwForm.newPassword} onChange={handlePwChange} autoComplete="new-password" required />
          </div>
          <div>
            <label className="label-field" htmlFor="confirm-new-password">{t("Confirm new password")}</label>
            <PasswordInput id="confirm-new-password" name="confirmPassword" maxLength={72} value={pwForm.confirmPassword} onChange={handlePwChange} autoComplete="new-password" required />
          </div>
          <Button type="submit" className="w-full" disabled={pwSaving}>
            {pwSaving ? t("Changing...") : t("Change password")}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function PrefRow({ icon: Icon, title, desc, checked, onChange, disabled }) {
  const { t } = useLang();
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 p-4">
      <div className="flex items-center gap-3">
        <Icon className="shrink-0 text-primary-500" />
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">{t(title)}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t(desc)}</p>
        </div>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} label={t("Toggle {title}", { title: t(title) })} disabled={disabled} />
    </div>
  );
}

function ToggleSwitch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative h-7 w-[52px] shrink-0 rounded-full border transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${
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
