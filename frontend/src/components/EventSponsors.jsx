import { useState } from "react";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LanguageContext";
import Button from "./Button";

const MAX_SPONSORS = 6;

// "Thanks to our partners": the sponsors an event's organisers list (a name and
// an optional website). Everyone sees the list; organisers (`canManage`) also
// get an editor. The server checks permission, the limits and the links again.
export default function EventSponsors({ eventId, sponsors = [], canManage, eventOver, onSaved }) {
  const toast = useToast();
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState([]);

  if (!sponsors.length && !(canManage && !eventOver)) return null;

  const startEdit = () => {
    setDraft(sponsors.map((s) => ({ name: s.name, url: s.url || "" })));
    setEditing(true);
  };
  const setRow = (i, patch) => setDraft((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put(`/events/${eventId}/sponsors`, { sponsors: draft.map((r) => ({ name: r.name, url: r.url })) });
      toast.success(t("Sponsors saved"));
      setEditing(false);
      onSaved?.();
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't save the sponsors")));
    } finally {
      setBusy(false);
    }
  };

  const input =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

  return (
    <section aria-labelledby="event-sponsors-heading" className="card-surface p-6" data-testid="event-sponsors">
      <div className="flex items-center justify-between gap-3">
        <h2 id="event-sponsors-heading" className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100">
          {t("Thanks to our partners")}
        </h2>
        {canManage && !eventOver && !editing && (
          <Button variant="outline" onClick={startEdit}>
            {sponsors.length ? t("Edit sponsors") : t("Add sponsors")}
          </Button>
        )}
      </div>

      {editing ? (
        <form onSubmit={save} className="mt-4 space-y-3">
          {draft.map((row, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <label className="min-w-40 flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("Sponsor name")}
                <input value={row.name} onChange={(e) => setRow(i, { name: e.target.value })} maxLength={60} required className={`${input} mt-1 block w-full`} />
              </label>
              <label className="min-w-40 flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("Website (optional)")}
                <input value={row.url} onChange={(e) => setRow(i, { url: e.target.value })} maxLength={200} inputMode="url" className={`${input} mt-1 block w-full`} />
              </label>
              <Button variant="ghost" onClick={() => setDraft((rows) => rows.filter((_, j) => j !== i))} aria-label={`${t("Remove")} ${row.name}`.trim()}>
                {t("Remove")}
              </Button>
            </div>
          ))}
          {draft.length < MAX_SPONSORS && (
            <Button variant="outline" onClick={() => setDraft((rows) => [...rows, { name: "", url: "" }])}>
              {t("Add a sponsor")}
            </Button>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {t("Save sponsors")}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              {t("Cancel")}
            </Button>
          </div>
        </form>
      ) : sponsors.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {sponsors.map((s) => (
            <li key={s.name} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer nofollow sponsored" className="underline decoration-slate-400 underline-offset-2 hover:text-primary-700 dark:hover:text-primary-300">
                  {s.name}
                  <span className="sr-only"> ({t("opens in a new tab")})</span>
                </a>
              ) : (
                s.name
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t("Thank the businesses and groups supporting this event. Add up to 6, each with an optional website.")}</p>
      )}
    </section>
  );
}
