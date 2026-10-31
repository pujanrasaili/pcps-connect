import { useState } from "react";
import { initialsOf } from "../utils/initials";

// A person's picture as a circle. If there is no picture, or it fails to load
// (the picture service is down, a bad link), the person's initials are shown
// instead of an empty or broken circle. `className` sets the size.
export default function Avatar({ user, className = "h-8 w-8" }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const src = user?.avatar;
  if (src && failedSrc !== src) {
    return <img src={src} alt="" onError={() => setFailedSrc(src)} className={`${className} rounded-full`} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`${className} inline-flex shrink-0 items-center justify-center rounded-full bg-primary-600 text-[0.7em] font-semibold text-white`}
    >
      {initialsOf(user?.name)}
    </span>
  );
}
