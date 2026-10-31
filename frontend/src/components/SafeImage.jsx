import { useState } from "react";

// An <img> that never shows a broken-image icon or stray alt text: when there
// is no source, or it fails to load (deleted upload, offline, blocked), a soft
// coloured block of the same size is shown instead. Pass the same className
// you would give the <img> (its width, height and object-fit apply to both).
export default function SafeImage({ src, alt = "", className = "", ...rest }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (src && failedSrc !== src) {
    return <img src={src} alt={alt} className={className} onError={() => setFailedSrc(src)} {...rest} />;
  }
  return (
    <div
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : "true"}
      className={`${className} bg-gradient-to-br from-primary-500/80 to-accent-500/80`}
    />
  );
}
