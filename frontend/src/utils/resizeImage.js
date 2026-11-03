// Phone photos are often 5-12 MB, over the server's 5 MB limit. Before an
// upload we shrink big pictures in the browser: the longest side is capped and
// the picture is re-saved as a JPEG. GIFs are left alone (resizing would stop
// the animation) and anything that fails to shrink is sent as it was.

export const MAX_SIDE = 2000;
export const SKIP_BELOW_BYTES = 1.5 * 1024 * 1024; // already small enough

// The size to draw a width x height picture at so its longest side is `max`.
export function fitWithin(width, height, max = MAX_SIDE) {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function shouldResize(file) {
  return !!file && /^image\/(jpeg|png|webp)$/.test(file.type) && file.size > SKIP_BELOW_BYTES;
}

export async function shrinkImage(file) {
  if (!shouldResize(file) || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
