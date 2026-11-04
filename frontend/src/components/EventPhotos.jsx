import { useRef, useState } from "react";
import { FaCamera, FaTrash } from "react-icons/fa";
import { api, getErrorMessage, resolveUploadUrl } from "../services/api";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "./ConfirmDialog";
import SafeImage from "./SafeImage";
import { shrinkImage } from "../utils/resizeImage";
import { useLang } from "../context/LanguageContext";


export const MAX_EVENT_PHOTOS = 8;

// The photo gallery on an event's page. Everyone sees the photos; admins and
// the event's club leaders (canManage) can add and remove them. A viewer who
// cannot manage an event with no photos sees nothing at all. onChange lets the
// page refresh its cached events, so coming back later shows the new photos.
export default function EventPhotos({ eventId, title, initialPhotos = [], canManage, onChange }) {
  const toast = useToast();
  const { t } = useLang();
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
      body.append("image", await shrinkImage(file));
      const { data } = await api.post(`/events/${eventId}/photos`, body);
      setPhotos(data.photos || []);
      toast.success(t("Photo added."));
      onChange?.();
    } catch (err) {
      toast.error(getErrorMessage(err, t("Could not add the photo")));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const { data } = await api.delete(`/events/${eventId}/photos`, { params: { url: removeTarget } });
      setPhotos(data.photos || []);
      toast.success(t("Photo removed."));
      onChange?.();
      setRemoveTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err, t("Could not remove the photo")));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <section aria-labelledby="event-photos-heading" className="card-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="event-photos-heading" className="font-display text-lg font-bold text-slate-800 dark:text-slate-100">
          {t("Photos")}
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
              {uploading ? t("Uploading...") : photos.length >= MAX_EVENT_PHOTOS ? t("Gallery full") : t("Add photo")}
            </button>
          </div>
        )}
      </div>

      {photos.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {t("No photos yet. Add up to {max} (jpg, png, webp or gif). Big photos are shrunk automatically.", { max: MAX_EVENT_PHOTOS })}
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((url, i) => (
            <li key={url} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
              <a href={resolveUploadUrl(url, 1600)} target="_blank" rel="noopener noreferrer" aria-label={t("Open photo {i} of {total} from {title}", { i: i + 1, total: photos.length, title })}>
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
                  aria-label={t("Remove photo {i}", { i: i + 1 })}
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
        title={t("Remove this photo?")}
        message={t("The photo is taken off the event page. This can't be undone.")}
        confirmLabel={t("Remove")}
        confirmingLabel={t("Removing...")}
      />
    </section>
  );
}
