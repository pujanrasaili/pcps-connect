// timeAgo() returns English ("5 min ago", "just now"); this shows it in the
// language chosen with `t` (the function from useLang()).
export function translateAgo(text, t) {
  const m = /^(\d+) (min|h|d) ago$/.exec(text);
  if (m) return t(`{n} ${m[2]} ago`, { n: m[1] });
  return t(text);
}
