// "Next in line" for the first place, otherwise "3rd in line" etc.
export function queueLabel(position) {
  if (!Number.isInteger(position) || position < 1) return "On the waitlist";
  if (position === 1) return "Next in line";
  const lastTwo = position % 100;
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[position % 10] || "th";
  return `${position}${suffix} in line`;
}
