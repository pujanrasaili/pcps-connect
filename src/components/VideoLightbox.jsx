import { useEffect } from "react";
import { FaTimes } from "react-icons/fa";

export default function VideoLightbox({ isOpen, onClose, src, poster }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Video player"
    >
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={onClose} />
      <button
        onClick={onClose}
        aria-label="Close video"
        className="absolute right-4 top-4 sm:right-6 sm:top-6 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <FaTimes className="text-lg" />
      </button>
      <div className="relative w-full max-w-md animate-slide-up">
        <video
          src={src}
          poster={poster}
          controls
          autoPlay
          playsInline
          className="max-h-[85vh] w-full rounded-2xl bg-black shadow-2xl"
        />
      </div>
    </div>
  );
}
