import { useRef, useState } from "react";
import { FaCamera, FaTrash } from "react-icons/fa";
import { api, getErrorMessage, resolveUploadUrl } from "../services/api";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "./ConfirmDialog";
import SafeImage from "./SafeImage";

export const MAX_EVENT_PHOTOS = 8;

// The photo gallery on an event's page. Everyone sees the photos; admins and
// the event's club leaders (canManage) can add and remove them. A viewer who
// cannot manage an event with no photos sees nothing at all. onChange lets the
// page refresh its cached events, so coming back later shows the new photos.
export default function EventPhotos({ eventId, title, initialPhotos = [], canManage, onChange }) {
  const toast = useToast();
  const fileInput = useRef(null);
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  if (photos.length === 0 && !canManage) return null;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("image", file);
      const { data } = await api.post(`/events/${eventId}/photos`, body);
      setPhotos(data.photos || []);
      toast.success("Photo added.");
      onChange?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not add the photo"));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const { data } = await api.delete(`/events/${eventId}/photos`, { params: { url: removeTarget } });
      setPhotos(data.photos || []);
      toast.success("Photo removed.");
      onChange?.();
      setRemoveTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not remove the photo"));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <section aria-labelledby="event-photos-heading" className="card-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="event-photos-heading" className="font-display text-lg font-bold text-slate-800 dark:text-slate-100">
          Photos
        </h2>
        {canManage && (
          <div>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFile}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading || photos.length >= MAX_EVENT_PHOTOS}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <FaCamera className="shrink-0" aria-hidden="true" />
              {uploading ? "Uploading..." : photos.length >= MAX_EVENT_PHOTOS ? "Gallery full" : "Add photo"}
            </button>
          </div>
        )}
      </div>

      {photos.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          No photos yet. Add up to {MAX_EVENT_PHOTOS} (jpg, png, webp or gif, max 5 MB each).
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((url, i) => (
            <li key={url} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
              <a href={resolveUploadUrl(url, 1600)} target="_blank" rel="noopener noreferrer" aria-label={`Open photo ${i + 1} of ${photos.length} from ${title}`}>
                <SafeImage
                  src={resolveUploadUrl(url, 600)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </a>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setRemoveTarget(url)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/70 text-white transition-colors hover:bg-rose-600"
                >
                  <FaTrash className="text-xs" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        confirming={removing}
        title="Remove this photo?"
        message="The photo is taken off the event page. This can't be undone."
        confirmLabel="Remove"
        confirmingLabel="Removing..."
      />
    </section>
  );
}
