import { Link } from "react-router-dom";
import { FaBullhorn } from "react-icons/fa";
import { formatDate } from "../utils/formatDate";
import { useLang } from "../context/LanguageContext";

// Dashboard card: the latest news posted by the clubs the student has joined.
// Renders nothing when there is none. Each item links to that club's page,
// where the full post and its photo are.
export default function ClubNewsFeedCard({ posts }) {
  const { t } = useLang();
  if (!posts || posts.length === 0) return null;
  return (
    <div className="card-surface min-w-0 p-5">
      <div className="mb-3 flex items-center gap-2">
        <FaBullhorn className="shrink-0 text-primary-500" aria-hidden="true" />
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t("News from your clubs")}</h2>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {posts.map((post) => (
          <li key={post._id}>
            <Link
              to={`/clubs?club=${post.club?._id}`}
              className="-mx-2 block rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <span className="block text-xs font-semibold text-primary-700 dark:text-primary-300">
                {post.club?.name} · {formatDate(post.createdAt)}
              </span>
              <span className="mt-0.5 line-clamp-2 block break-words text-sm text-slate-700 dark:text-slate-200">{post.body}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
