import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LanguageContext";
import Button from "./Button";

// On the student's Profile: the clubs they chose to be listed under as alumni,
// with a way to take each one off. Hidden when there is nothing to show, and
// quiet if the list can't load (it is a convenience, not a core page).
export default function MyAlumniCard() {
  const toast = useToast();
  const { t } = useLang();
  const [alumni, setAlumni] = useState([]);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/club-memberships/alumni", { quiet: true })
      .then((res) => !cancelled && setAlumni(res.data.alumni || []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!alumni.length) return null;

  const remove = async (entry) => {
    setBusyId(entry._id);
    try {
      await api.delete(`/clubs/${entry.clubId}/alumni/${entry._id}`);
      setAlumni((prev) => prev.filter((a) => a._id !== entry._id));
      toast.success(t("Alumni entry removed."));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't remove the entry")));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section aria-labelledby="my-alumni-heading" className="card-surface p-6" data-testid="my-alumni">
      <h2 id="my-alumni-heading" className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
        {t("My alumni listings")}
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t("Other logged-in students can see your name on these clubs' alumni lists.")}</p>
      <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {alumni.map((a) => (
          <li key={a._id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0 text-sm text-slate-700 dark:text-slate-200">
              <Link to={`/clubs?club=${a.clubId}`} className="font-medium underline decoration-slate-300 underline-offset-2 hover:text-primary-700 dark:hover:text-primary-300">
                {a.clubName}
              </Link>
              {(a.year || a.note) && (
                <span className="block truncate text-xs text-slate-600 dark:text-slate-300">{[a.year ? t("Left {year}", { year: a.year }) : "", a.note].filter(Boolean).join(" · ")}</span>
              )}
            </span>
            <Button variant="outline" disabled={busyId === a._id} onClick={() => remove(a)} aria-label={t("Remove {name} from the alumni", { name: a.clubName })}>
              {t("Remove")}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
