import { useLang } from "../context/LanguageContext";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';

export default function Modal({ isOpen, onClose, title, children, size = "md" }) {
  const { t } = useLang();
  const dialogRef = useRef(null);
  const drag = useRef(null);

  // Callers usually pass an inline arrow function for onClose, which is a
  // brand-new function on every render. If the effect below depended on it
  // directly, every keystroke in a form inside the modal (each one re-renders
  // the parent) would tear the effect down and set it up again -- restoring
  // focus to the button that opened the modal and then moving it to the
  // dialog's first control (the close button), so only the first character
  // typed would land. A ref always holds the latest onClose without that.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

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
      // A control marked data-autofocus (the search box, say) wins, so people
      // can start typing straight away; otherwise the first focusable one.
      const preferred = dialogRef.current?.querySelector("[data-autofocus]");
      const focusable = dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
      (preferred || focusable?.[0] || dialogRef.current)?.focus();
    };
    focusFirst();

    const onKey = (e) => {
      if (e.key === "Escape") {
        onCloseRef.current();
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
  }, [isOpen]);


  // Swipe the top of the sheet down to close it, the way a phone app's sheet works.
  // It only follows the finger on a phone, and snaps back if the swipe was short.
  // (The panel is moved with the separate "translate" property because its slide-in
  // animation already owns "transform".)
  const isPhone = () => window.matchMedia("(max-width: 639px)").matches;
  const dragStart = (e) => {
    if (!isPhone()) return;
    drag.current = { from: e.touches[0].clientY, dy: 0 };
    if (dialogRef.current) dialogRef.current.style.transition = "none";
  };
  const dragMove = (e) => {
    if (!drag.current || !dialogRef.current) return;
    drag.current.dy = Math.max(0, e.touches[0].clientY - drag.current.from);
    dialogRef.current.style.translate = `0 ${drag.current.dy}px`;
  };
  const dragEnd = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !dialogRef.current) return;
    if (d.dy > 110) {
      onCloseRef.current();
      return;
    }
    dialogRef.current.style.transition = "translate 0.2s ease-out";
    dialogRef.current.style.translate = "0 0";
  };

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  // Drawn straight into <body>: inside the top bar (whose blurred background makes a
  // "fixed" box fit the bar instead of the screen) the search window was squashed
  // into the bar's 64px and pushed off the top of the page.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in sm:items-center sm:p-4"
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
        className={`relative w-full ${sizes[size]} card-surface max-h-[92dvh] overflow-y-auto overscroll-contain rounded-b-none rounded-t-3xl pb-[env(safe-area-inset-bottom)] outline-none max-sm:animate-sheet-up sm:max-h-[90vh] sm:rounded-2xl sm:pb-0 sm:animate-slide-up`}
      >
        <div onTouchStart={dragStart} onTouchMove={dragMove} onTouchEnd={dragEnd} onTouchCancel={dragEnd} className="sticky top-0 z-10 max-sm:touch-none border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-t-3xl sm:rounded-t-2xl">
          <span aria-hidden="true" className="mx-auto mt-2 block h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" />
          <div className="flex items-center justify-between px-6 py-3 sm:py-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label={t("Close dialog")}
            className="rounded-full p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <FaTimes />
          </button>
          </div>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
