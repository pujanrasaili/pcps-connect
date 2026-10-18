// pluralize(1, "event") -> "1 event", pluralize(3, "event") -> "3 events".
export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
