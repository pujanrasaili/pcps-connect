import { FaMobileAlt } from "react-icons/fa";
import { useInstallApp } from "../hooks/useInstallApp";
import Button from "./Button";

// "Add PCPS Connect to your home screen". Renders nothing when installing isn't
// possible or the site is already open as an app.
export default function InstallAppCard({ className = "mt-6" }) {
  const { mode, install } = useInstallApp();
  if (mode === "hidden") return null;
  return (
    <div className={`card-surface ${className} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
          <FaMobileAlt />
        </span>
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">Add PCPS Connect to your home screen</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {mode === "ios-steps"
              ? 'Tap the Share button in Safari, then "Add to Home Screen". Your tickets will be one tap away.'
              : "Open it like an app, straight from your home screen. Your tickets will be one tap away."}
          </p>
        </div>
      </div>
      {mode === "prompt" && (
        <Button onClick={install} className="shrink-0">
          Install
        </Button>
      )}
    </div>
  );
}
