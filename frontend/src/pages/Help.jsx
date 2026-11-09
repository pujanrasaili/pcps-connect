import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaChevronDown } from "react-icons/fa";
import { HELP_TOPICS } from "../utils/helpTopics";
import { useLang } from "../context/LanguageContext";

export default function Help() {
  const { t } = useLang();
  const { hash } = useLocation();

  // An address like /help#club-ideas opens that question and brings it into view.
  // The browser's own jump happens before this page is drawn, so it is done here.
  useEffect(() => {
    let id = "";
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    const topic = id ? document.getElementById(id) : null;
    if (topic instanceof HTMLDetailsElement) {
      topic.open = true;
      topic.scrollIntoView({ block: "start" });
    }
  }, [hash]);

  return (
    <div className="section-y">
      <div className="container-page max-w-3xl">
        <span className="text-sm font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-300">{t("Help")}</span>
        <h1 className="mt-1 font-display text-3xl font-bold text-slate-800 dark:text-slate-100 sm:text-4xl">
          {t("Questions students ask")}
        </h1>
        <p className="mt-3 text-slate-500 dark:text-slate-400">
          {t("Quick answers about accounts, events and certificates. Can't find yours?")} <Link to="/contact" className="font-semibold text-primary-600 hover:underline dark:text-primary-300">{t("Contact us")}</Link>.
        </p>

        <div className="mt-8 space-y-3">
          {HELP_TOPICS.map((topic) => (
            <details key={topic.id} id={topic.id} className="group card-surface px-5 py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 font-medium text-slate-800 dark:text-slate-100 [&::-webkit-details-marker]:hidden">
                <span>{t(topic.question)}</span>
                <FaChevronDown className="shrink-0 text-xs text-slate-500 transition-transform group-open:rotate-180 dark:text-slate-400" aria-hidden="true" />
              </summary>
              <div className="space-y-2 pb-4 text-sm text-slate-600 dark:text-slate-300">
                {topic.answer.map((paragraph, i) => (
                  <p key={i}>{t(paragraph)}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
