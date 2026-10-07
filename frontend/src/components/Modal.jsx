import { useEffect, useRef } from "react";
import { FaTimes } from "react-icons/fa";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';

export default function Modal({ isOpen, onClose, title, children, size = "md" }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Remembers what had focus before opening, so it can be restored on
    // close -- without this, focus silently falls back to <body> and a
    // keyboard user loses their place in the page entirely.
    const previouslyFocused = document.activeElement;

    // Moves focus into the dialog itself on open. Screen readers and
    // keyboard users otherwise have no indication focus ever left the
    // trigger button behind the (visually obvious, but not programmatically
    // connected) backdrop.
    const focusFirst = () => {
      const focusable = dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
      (focusable?.[0] || dialogRef.current)?.focus();
    };
    focusFirst();

    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Basic focus trap: Tab/Shift+Tab cycles within the dialog instead of
      // escaping into page content hidden behind the backdrop.
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative w-full ${sizes[size]} card-surface max-h-[90vh] overflow-y-auto animate-slide-up outline-none`}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-6 py-4 rounded-t-2xl">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <FaTimes />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
