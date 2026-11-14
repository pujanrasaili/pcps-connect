import { useMemo, useState } from "react";
import { FaBell } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useEvents } from "../context/EventsContext";
import { useLang } from "../context/LanguageContext";
import { useToast } from "../context/ToastContext";

const MAX_TOPICS = 5;

// "Topics you follow" (Settings): the student ticks event categories and gets a
// bell message when a new event in one is announced. The topics on offer are the
// categories events actually use (admins type them freely), compared in lower
// case, plus any the student already follows. Saved on each tap.
export default function TopicPicker() {
  const { user, updateUser } = useAuth();
  const { events } = useEvents();
  const { t } = useLang();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const chosen = user?.interests || [];

  const options = useMemo(() => {
    const seen = new Map();
    for (const e of events) {
      const name = String(e.category || "").trim();
      const key = name.toLowerCase();
      if (name && key !== "general" && !seen.has(key)) seen.set(key, name);
    }
    for (const key of chosen) if (!seen.has(key)) seen.set(key, key);
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [events, chosen]);

  if (options.length === 0) return null;

  const toggle = async (key) => {
    const next = chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key];
    setSaving(true);
    const result = await updateUser({ interests: next });
    setSaving(false);
    if (!result.ok) toast.error(result.message || t("Failed to update preference"));
  };

  return (
    <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
      <div className="flex items-start gap-3">
        <FaBell className="mt-1 shrink-0 text-primary-500" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="font-medium text-slate-800 dark:text-slate-100">{t("Topics you follow")}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("Get a bell message when a new event in one of these topics is announced. Pick up to {n}.", { n: MAX_TOPICS })}
          </p>
        </div>
      </div>
      <div role="group" aria-label={t("Topics you follow")} className="mt-3 flex flex-wrap gap-2">
        {options.map(([key, label]) => {
          const on = chosen.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              aria-pressed={on}
              disabled={saving || (!on && chosen.length >= MAX_TOPICS)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                on
                  ? "gradient-brand text-white shadow-soft"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-primary-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {t(label)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
