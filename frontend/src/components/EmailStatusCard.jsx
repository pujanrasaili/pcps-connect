import { emailNotice } from "../utils/emailStatus";
import { useLang } from "../context/LanguageContext";

// Admin overview warning about the email setup. Renders nothing while loading,
// if the health check fails, or when mail goes through Brevo.
export default function EmailStatusCard({ provider }) {
  const { t } = useLang();
  const notice = emailNotice(provider);
  if (!notice) return null;
  return (
    <div
      role="status"
      className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <p className="font-semibold">{t(notice.title)}</p>
      <p className="mt-1">{t(notice.text)}</p>
    </div>
  );
}
