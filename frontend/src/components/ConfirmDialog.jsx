import Modal from "./Modal";
import Button from "./Button";

// Thin wrapper around Modal for "are you sure?" confirmations, so admin
// pages don't each re-implement the same delete-confirmation UI.
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirming,
  confirmLabel = "Delete",
  confirmingLabel = "Deleting...",
  tone = "danger",
}) {
  const toneClass =
    tone === "success" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-rose-600 hover:bg-rose-700";
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      <div className="mt-5 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={confirming}>
          Cancel
        </Button>
        <button
          onClick={onConfirm}
          disabled={confirming}
          className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors disabled:opacity-50 ${toneClass}`}
        >
          {confirming ? confirmingLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
