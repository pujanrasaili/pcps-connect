// The Nepali dictionary is large (about 100 KB), so English visitors never
// download it. It loads on demand the first time Nepali is needed and is then
// kept here for code that runs outside React (date formatting, the error
// screen).
let loaded = null;
let pending = null;

export const getNe = () => loaded;

export function loadNe() {
  if (loaded) return Promise.resolve(loaded);
  if (!pending) {
    pending = import("./ne.js")
      .then((module) => {
        loaded = module.ne;
        return loaded;
      })
      .catch((error) => {
        pending = null; // allow a later retry
        throw error;
      });
  }
  return pending;
}
