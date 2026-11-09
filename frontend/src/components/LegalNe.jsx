import { Link } from "react-router-dom";

// Nepali version of the Privacy / Terms pages, rendered from the data in i18n/legalNe.js.
export default function LegalNe({ doc }) {
  return (
    <div className="section-y">
      <div className="container-page max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-slate-800 dark:text-slate-100 sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{doc.updated}</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          यो नेपाली अनुवाद हो। फरक परे अंग्रेजी संस्करण नै मान्य हुनेछ।
        </p>
        <div className="card-surface mt-8 space-y-6 p-6 sm:p-8">
          {doc.sections.map((s) => (
            <div key={s.title}>
              <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {s.body.map((piece, i) =>
                  typeof piece === "string" ? (
                    <span key={i}>{piece}</span>
                  ) : (
                    <Link key={i} to={piece.to} className="text-primary-600 dark:text-primary-300 underline underline-offset-2">
                      {piece.text}
                    </Link>
                  ),
                )}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
