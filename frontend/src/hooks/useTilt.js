import { useRef } from "react";

/**
 * Lightweight 3D tilt-on-hover effect. Tracks pointer position within the
 * element and applies a perspective rotation so the card appears to tilt
 * toward the cursor, with a subtle "lift" on hover.
 */
export function useTilt({ max = 8, scale = 1.02 } = {}) {
  const ref = useRef(null);

  const handleMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const rotateX = (-y * max).toFixed(2);
    const rotateY = (x * max).toFixed(2);
    el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`;
  };

  const handleMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
  };

  return {
    ref,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    style: { transition: "transform 0.15s ease-out", transformStyle: "preserve-3d", willChange: "transform" },
  };
}
