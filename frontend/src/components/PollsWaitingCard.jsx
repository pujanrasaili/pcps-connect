import { Link } from "react-router-dom";
import { FaPoll } from "react-icons/fa";
import { formatDate } from "../utils/formatDate";
import { useLang } from "../context/LanguageContext";

// Dashboard card: open club polls the student has not voted on yet.
// Renders nothing when there are none. Each item opens that club's page,
// where the poll is.
export default function PollsWaitingCard({ polls }) {
  const { t } = useLang();
  if (!polls || polls.length === 0) return null;
  return (
    <div className="card-surface min-w-0 p-5">
      <div className="mb-3 flex items-center gap-2">
        <FaPoll className="shrink-0 text-primary-500" aria-hidden="true" />
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t("Polls waiting for your vote")}</h2>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {polls.map((poll) => (
          <li key={poll._id}>
            <Link
              to={`/clubs?club=${poll.club?._id}`}
              className="-mx-2 block rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <span className="block text-xs font-semibold text-primary-700 dark:text-primary-300">
                {poll.club?.name} · {t("Closes {date}", { date: formatDate(poll.closesAt) })}
              </span>
              <span className="mt-0.5 line-clamp-2 block break-words text-sm text-slate-700 dark:text-slate-200">{poll.question}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
