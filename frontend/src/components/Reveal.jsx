/**
 * Used to fade and slide each section in as it scrolled into view. Content now
 * simply appears: sections that are hidden until you scroll to them feel slow on
 * a phone (the page looks empty for a moment) and read as a template effect.
 * The component stays so every page keeps its markup, and so a single reveal
 * can be brought back in one place if one is ever wanted.
 */
export default function Reveal({ children, className = "", as: Tag = "div" }) {
  return <Tag className={className}>{children}</Tag>;
}
