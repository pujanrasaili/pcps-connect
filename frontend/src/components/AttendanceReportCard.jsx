import { useState } from "react";
import { Stars } from "./StarRating";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { downloadCsv } from "../utils/csv";
import { attendanceCsv } from "../utils/attendanceCsv";
import { reportFileName, reportPeriod } from "../utils/reportPeriod";
import { useLang } from "../context/LanguageContext";

// Turnout and ratings for the most recent past events (admins: everything;
// club leaders: only their own clubs -- the server decides). `report` is the
// /admin/attendance-report payload; renders nothing until there's data.
export default function AttendanceReportCard({ report }) {
  const toast = useToast();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  if (!report?.events?.length) return null;

  const download = async () => {
    const period = reportPeriod(from, to);
    if (period.error) return toast.error(t("The end date must not be before the start date."));
    setBusy(true);
    try {
      const { data } = await api.get("/admin/attendance-report", { params: period.params });
      downloadCsv(reportFileName(new Date().toISOString().slice(0, 10), from, to), attendanceCsv(data));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't download the report. Please try again.")));
    } finally {
      setBusy(false);
    }
  };
  return (
  <div className="card-surface p-5">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t("Attendance & feedback")}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(report.events.length > 1 ? "Last {n} past events" : "Last {n} past event", { n: report.events.length })}
              </p>
            </div>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
              {report.totals.attendanceRate === null
                ? t("No registrations yet.")
                : t("{attended} of {registered} registered students showed up ({rate}%)", { attended: report.totals.attended, registered: report.totals.registered, rate: report.totals.attendanceRate })}
              {report.totals.averageRating !== null && (
                <span className="ml-2 inline-flex items-center gap-1.5">
                  · <Stars value={Math.round(report.totals.averageRating)} className="text-xs" />
                  <span className="font-semibold">{report.totals.averageRating.toFixed(1)}</span>
                </span>
              )}
            </p>
            <ul className="space-y-3">
              {report.events.map((e) => (
                <li key={e._id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">{e.title}</span>
                    <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                      {e.attendanceRate === null ? t("No registrations") : `${e.attended}/${e.registered} · ${e.attendanceRate}%`}
                      {e.averageRating !== null && ` · ★ ${e.averageRating.toFixed(1)}`}
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                    role="img"
                    aria-label={t("{title}: {rate}% attended", { title: e.title, rate: e.attendanceRate ?? 0 })}
                  >
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${e.attendanceRate ?? 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <fieldset className="mt-4">
              <legend className="label-field">{t("Report period (optional)")}</legend>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-300" htmlFor="report-from">{t("From")}</label>
                  <input id="report-from" type="date" className="input-field" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-300" htmlFor="report-to">{t("To")}</label>
                  <input id="report-to" type="date" className="input-field" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("Leave both empty to include every past event.")}</p>
            </fieldset>
            <button type="button" onClick={download} disabled={busy} className="btn-secondary mt-4 text-sm">
              {busy ? t("Preparing…") : t("Download full report (CSV)")}
            </button>
          </div>
  );
}
