// Up to two capital letters from a person's name ("Asha Rai" -> "AR",
// "Madonna" -> "M"); "?" when there is no usable name.
export function initialsOf(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]];
  return letters.map((w) => Array.from(w)[0].toUpperCase()).join("");
}
