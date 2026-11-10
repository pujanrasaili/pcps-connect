import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LanguageContext";
import Button from "./Button";
import { buildCsv, downloadCsv, slugify } from "../utils/csv";

const MAX_ROLES = 5;
const MAX_NAME = 40;

// Whatever the server (or a proxy error page) sends back, the page gets a list of roles.
const shape = (d) => ({ roles: Array.isArray(d?.roles) ? d.roles : [], mine: d?.mine ?? null, past: !!d?.past });

// "Help out" on an event page: helper roles (registration desk, setup...) that
// students sign up for, one role per event. The event's organisers (`canManage`)
// also see who signed up and can edit the roles. The server enforces all of
// this again, so hiding controls here is only convenience.
export default function EventVolunteers({ eventId, eventTitle, eventOver, canManage, isAuthenticated }) {
  const toast = useToast();
  const { t } = useLang();
  const [data, setData] = useState(null); // null = loading
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);

  const load = () =>
    api
      .get(`/events/${eventId}/volunteers`)
      .then((res) => setData(shape(res.data)))
      .catch(() => setData({ roles: [], mine: null, past: false })); // never block the event page

  useEffect(() => {
    let cancelled = false;
    setData(null);
    api
      .get(`/events/${eventId}/volunteers`)
      .then((res) => !cancelled && setData(shape(res.data)))
      .catch(() => !cancelled && setData({ roles: [], mine: null, past: false }));
    return () => {
      cancelled = true;
    };
  }, [eventId, isAuthenticated, canManage]);

  if (!data) return null;
  if (data.roles.length === 0 && !canManage) return null;
  if (data.roles.length === 0 && eventOver) return null;

  const join = async (roleId) => {
    setBusy(true);
    try {
      await api.post(`/events/${eventId}/volunteers`, { role: roleId });
      toast.success(t("You're signed up to help!"));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't sign you up")));
    } finally {
      await load();
      setBusy(false);
    }
  };

  const leave = async () => {
    setBusy(true);
    try {
      await api.delete(`/events/${eventId}/volunteers`);
      toast.success(t("You're no longer helping at this event."));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't cancel")));
    } finally {
      await load();
      setBusy(false);
    }
  };

  // Organisers can take the list of helpers away as a spreadsheet.
  const exportCsv = () => {
    const rows = data.roles.flatMap((r) => (r.volunteers || []).map((v) => [r.name, v.name, v.email]));
    downloadCsv(`${slugify(eventTitle, "event")}-volunteers.csv`, buildCsv(["Role", "Name", "Email"], rows));
  };
  const hasVolunteers = data.roles.some((r) => (r.volunteers || []).length > 0);

  const startEdit = () => {
    setDraft(data.roles.map((r) => ({ _id: r._id, name: r.name, slots: String(r.slots) })));
    setEditing(true);
  };
  const setRow = (i, patch) => setDraft((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.put(`/events/${eventId}/volunteer-roles`, {
        roles: draft.map((r) => ({ ...(r._id ? { _id: r._id } : {}), name: r.name, slots: Number(r.slots) })),
      });
      setData(shape(res.data));
      setEditing(false);
      toast.success(t("Volunteer roles saved"));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't save the roles")));
    } finally {
      setBusy(false);
    }
  };

  const input =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

  return (
    <section aria-labelledby="event-volunteers-heading" className="card-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="event-volunteers-heading" className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100">
          {t("Help out")}
        </h2>
        {canManage && !editing && (
          <div className="flex flex-wrap gap-2">
            {hasVolunteers && (
              <Button variant="outline" onClick={exportCsv}>
                {t("Export CSV")}
              </Button>
            )}
            <Button variant="outline" onClick={startEdit}>
              {data.roles.length ? t("Edit roles") : t("Add volunteer roles")}
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <form onSubmit={save} className="mt-4 space-y-3">
          {draft.map((row, i) => (
            <div key={row._id || `new-${i}`} className="flex flex-wrap items-end gap-2">
              <label className="min-w-[10rem] flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("Role name")}
                <input
                  value={row.name}
                  onChange={(e) => setRow(i, { name: e.target.value })}
                  maxLength={MAX_NAME}
                  required
                  className={`${input} mt-1 block w-full`}
                />
              </label>
              <label className="w-24 text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("Places")}
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={row.slots}
                  onChange={(e) => setRow(i, { slots: e.target.value })}
                  required
                  className={`${input} mt-1 block w-full`}
                />
              </label>
              <Button variant="ghost" onClick={() => setDraft((rows) => rows.filter((_, j) => j !== i))} aria-label={`${t("Remove")} ${row.name}`.trim()}>
                {t("Remove")}
              </Button>
            </div>
          ))}
          {draft.length < MAX_ROLES && (
            <Button variant="outline" onClick={() => setDraft((rows) => [...rows, { name: "", slots: "2" }])}>
              {t("Add a role")}
            </Button>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {t("Removing a role also removes the sign-ups for it.")}
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {t("Save roles")}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              {t("Cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.roles.map((role) => {
            const full = role.filled >= role.slots;
            const mine = data.mine === String(role._id);
            return (
              <li key={role._id} className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{role.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {t("{filled} of {slots} places taken", { filled: role.filled, slots: role.slots })}
                    </p>
                  </div>
                  {mine ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{t("You're helping here")}</span>
                      {!eventOver && (
                        <Button variant="outline" onClick={leave} disabled={busy}>
                          {t("Cancel")}
                        </Button>
                      )}
                    </div>
                  ) : eventOver ? null : full ? (
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("Full")}</span>
                  ) : isAuthenticated ? (
                    <Button onClick={() => join(role._id)} disabled={busy || !!data.mine}>
                      {t("Sign up to help")}
                    </Button>
                  ) : null}
                </div>
                {canManage && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    {role.volunteers?.length ? role.volunteers.map((v) => v.name).join(", ") : t("No one yet.")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!editing && !isAuthenticated && !eventOver && data.roles.length > 0 && (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          <Link to="/login" className="font-semibold text-primary-600 underline underline-offset-2 dark:text-primary-300">
            {t("Log in")}
          </Link>{" "}
          {t("to sign up to help.")}
        </p>
      )}
      {!editing && isAuthenticated && !eventOver && data.mine === null && data.roles.length > 0 && (
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">{t("You can help in one role at an event.")}</p>
      )}
    </section>
  );
}
