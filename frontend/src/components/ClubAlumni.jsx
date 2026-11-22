import { useEffect, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LanguageContext";
import { useClubMembership } from "../context/ClubMembershipContext";
import Button from "./Button";

const MAX_NOTE = 80;

// A club's alumni: former members who chose to stay listed. Any logged-in
// student can read the list. A current member (`member`) can step down, which
// leaves the club and adds them to the list; a person can remove their own
// entry, and the club's leaders and admins (`staff`) can remove any. The
// server checks all of this again. Mount it with a key per club.
export default function ClubAlumni({ clubId, member, staff }) {
  const toast = useToast();
  const { t } = useLang();
  const { stepDownToAlumni } = useClubMembership();
  const [alumni, setAlumni] = useState(null); // null = still loading
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/clubs/${clubId}/alumni`)
      .then((res) => !cancelled && setAlumni(res.data.alumni || []))
      .catch(() => !cancelled && setAlumni([])); // a nice-to-have: never block the club page
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  if (alumni === null) return null;
  if (!alumni.length && !member) return null;

  const handleStepDown = async (e) => {
    e.preventDefault();
    setBusy(true);
    const created = await stepDownToAlumni(clubId, { year: year || undefined, note });
    setBusy(false);
    if (created) {
      setAlumni((prev) => [created, ...(prev || []).filter((a) => a._id !== created._id)]);
      setOpen(false);
      toast.success(t("You left the club and are now listed as alumni."));
    }
  };

  const handleRemove = async (entry) => {
    try {
      await api.delete(`/clubs/${clubId}/alumni/${entry._id}`);
      setAlumni((prev) => (prev || []).filter((a) => a._id !== entry._id));
      toast.success(t("Alumni entry removed."));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't remove the entry")));
    }
  };

  return (
    <section aria-labelledby="club-alumni-heading" className="mt-5" data-testid="club-alumni">
      <h3 id="club-alumni-heading" className="font-semibold text-slate-800 dark:text-slate-100">
        {t("Alumni")}
      </h3>

      {alumni.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          {alumni.map((a) => (
            <li key={a._id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 text-slate-700 dark:text-slate-200">
                <span className="font-medium">{a.name}</span>
                {a.mine ? ` ${t("(you)")}` : ""}
                {(a.year || a.note) && (
                  <span className="block wrap-break-word text-xs text-slate-600 dark:text-slate-300">{[a.year ? t("Left {year}", { year: a.year }) : "", a.note].filter(Boolean).join(" · ")}</span>
                )}
              </span>
              {(staff || a.mine) && (
                <button
                  type="button"
                  onClick={() => handleRemove(a)}
                  aria-label={t("Remove {name} from the alumni", { name: a.name })}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/20"
                >
                  <FaTrash className="text-xs" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {member &&
        (open ? (
          <form onSubmit={handleStepDown} className="mt-3 space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">{t("This leaves the club and lists your name here for other students to see.")}</p>
            <div className="flex flex-wrap gap-2">
              <label className="w-28 text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("Year you left")}
                <input className="input-field mt-1" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} />
              </label>
              <label className="min-w-40 flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("A short note (optional)")}
                <input className="input-field mt-1" value={note} maxLength={MAX_NOTE} onChange={(e) => setNote(e.target.value)} placeholder={t("e.g. President 2024")} />
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {t("Leave and join the alumni")}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t("Cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-3">
            <Button variant="outline" onClick={() => setOpen(true)}>
              {t("Step down to alumni")}
            </Button>
          </div>
        ))}
    </section>
  );
}
