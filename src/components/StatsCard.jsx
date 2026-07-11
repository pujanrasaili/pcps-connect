import { useEffect, useState } from "react";

function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start = null;
    let frame;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

export default function StatsCard({ icon: Icon, label, value, suffix = "", accent = "primary" }) {
  const isNumeric = typeof value === "number";
  const animatedValue = useCountUp(isNumeric ? value : 0);

  const accents = {
    primary: "bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300",
    accent: "bg-accent-50 text-accent-500 dark:bg-accent-900/40 dark:text-accent-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
  };

  return (
    <div className="card-surface flex items-center gap-4 p-5 animate-slide-up">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accents[accent]}`}>
        <Icon className="text-xl" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {isNumeric ? animatedValue : value}
          {suffix}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}
