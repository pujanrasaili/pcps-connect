import { useEffect, useState } from "react";
import { FaVideo } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LanguageContext";
import Button from "./Button";

const MAX_LINK = 300;

// The online-meeting link of an event (Zoom, Meet...). Only people who may see
// it are shown anything: students with a confirmed registration get a "Join
// online" button, and the organisers (`canManage`) can set or remove the link.
// The server enforces who sees it; hiding things here is only convenience.
export default function EventJoinLink({ eventId, registered, canManage, eventOver }) {
  const toast = useToast();
  const { t } = useLang();
  const [link, setLink] = useState(null); // null = not loaded or not allowed
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const allowed = canManage || registered;

  useEffect(() => {
    let cancelled = false;
    setLink(null);
    if (!allowed) return undefined;
    api
      .get(`/events/${eventId}/join-link`)
      .then((res) => {
        if (cancelled) return;
        const value = typeof res.data?.link === "string" ? res.data.link : "";
        setLink(value);
        setDraft(value);
      })
      .catch(() => !cancelled && setLink(null)); // pending, refused or offline: show nothing
    return () => {
      cancelled = true;
    };
  }, [eventId, allowed]);

  if (link === null) return null;
  if (!canManage && (!link || eventOver)) return null;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put(`/events/${eventId}/join-link`, { link: draft });
      const value = typeof res.data?.link === "string" ? res.data.link : "";
      setLink(value);
      setDraft(value);
      toast.success(t(value ? "Link saved" : "Link removed"));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't save the link")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="event-join-heading" className="card-surface p-6">
      <h2 id="event-join-heading" className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100">
        {t("Online link")}
      </h2>
      {link && !eventOver && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-3 inline-flex items-center gap-2"
        >
          <FaVideo /> {t("Join online")}
        </a>
      )}
      {canManage && (
        <form onSubmit={save} className="mt-4">
          <label htmlFor="event-join-link" className="label-field">
            {t("Meeting link (https://...)")}
          </label>
          <input
            id="event-join-link"
            type="url"
            inputMode="url"
            maxLength={MAX_LINK}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://meet.google.com/..."
            className="input-field"
          />
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {t("Only students registered for this event, and its organisers, can see this link. Leave it empty to remove it.")}
          </p>
          <div className="mt-2">
            <Button type="submit" disabled={saving || draft.trim() === link}>
              {saving ? t("Saving...") : t("Save link")}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
