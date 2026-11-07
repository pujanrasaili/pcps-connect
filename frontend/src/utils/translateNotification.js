// Bell messages are written by the server in English with the names already
// filled in ("Hack Night was cancelled"). To show them in Nepali we recognise
// each known shape, pull the names out and fill them into the translated
// sentence. Anything not recognised (for example a club's own message) is
// shown exactly as it arrived.
export const NOTIFICATION_PATTERNS = [
  [/^(.+) asked to join (.+)$/, "{name} asked to join {target}", ["name", "target"]],
  [/^(.+) was updated \(new time or place\)$/, "{title} was updated (new time or place)", ["title"]],
  [/^(.+) was cancelled$/, "{title} was cancelled", ["title"]],
  [/^New message about (.+)$/, "New message about {title}", ["title"]],
  [/^New message from (.+)$/, "New message from {name}", ["name"]],
  [/^Your question about (.+) was answered$/, "Your question about {title} was answered", ["title"]],
  [/^You're in: your request to join (.+) was approved$/, "You're in: your request to join {title} was approved", ["title"]],
  [/^Your request to join (.+) was declined$/, "Your request to join {title} was declined", ["title"]],
  [/^(.+) verified their email and is waiting for approval$/, "{name} verified their email and is waiting for approval", ["name"]],
  [/^You're in! (.+) approved your request to join$/, "You're in! {club} approved your request to join", ["club"]],
  [/^A seat opened for (.+) - your request is waiting for approval$/, "A seat opened for {title} - your request is waiting for approval", ["title"]],
  [/^You got a seat: (.+)$/, "You got a seat: {title}", ["title"]],
  [/^(.+) declined your request to join$/, "{club} declined your request to join", ["club"]],
  [/^(.+) shared a news update$/, "{club} shared a news update", ["club"]],
  [/^(.+) announced (.+)$/, "{club} announced {title}", ["club", "title"]],
];

export function translateNotification(title, t) {
  if (typeof title !== "string") return title;
  for (const [pattern, key, names] of NOTIFICATION_PATTERNS) {
    const match = title.match(pattern);
    if (!match) continue;
    const values = {};
    names.forEach((name, i) => {
      values[name] = match[i + 1];
    });
    return t(key, values);
  }
  return t(title);
}
