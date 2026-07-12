import { useInView } from "../hooks/useInView";

const VARIANTS = {
  up: "translate-y-8",
  down: "-translate-y-8",
  left: "translate-x-8",
  right: "-translate-x-8",
  scale: "scale-95",
};

/**
 * Wraps content that should fade/slide into place the first time it
 * scrolls into view. Pure CSS transition driven by IntersectionObserver --
 * no animation library needed.
 */
export default function Reveal({ children, className = "", direction = "up", delay = 0, as: Tag = "div" }) {
  const { ref, inView } = useInView();

  return (
    <Tag
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        inView ? "opacity-100 translate-x-0 translate-y-0 scale-100" : `opacity-0 ${VARIANTS[direction]}`
      } ${className}`}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
    >
      {children}
    </Tag>
  );
}
