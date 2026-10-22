import { useState } from "react";
import { FaEye, FaEyeSlash, FaLock } from "react-icons/fa";

// A password box with a show/hide button. `autoComplete` matters: use
// "new-password" when choosing a password and "current-password" when typing an
// existing one, so password managers can offer to save or generate it.
export default function PasswordInput({ icon = false, autoComplete, className = "", ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      {icon && (
        <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
      )}
      <input
        {...props}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        className={`input-field ${className}`}
        style={{ paddingLeft: icon ? "2.75rem" : undefined, paddingRight: "2.75rem" }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
      >
        {visible ? <FaEyeSlash /> : <FaEye />}
      </button>
    </div>
  );
}
