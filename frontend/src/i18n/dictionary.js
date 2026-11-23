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

// Switching to Nepali used to wait for the dictionary download (about 47 KB
// compressed), which is noticeable on a slow phone connection. On a fast
// connection it is fetched quietly once the page is idle, so the switch is
// instant; people on a slow or data-saving connection still only download it
// when they ask for Nepali.
export function shouldPrefetchNe(connection) {
  if (!connection) return true;
  if (connection.saveData) return false;
  return !connection.effectiveType || connection.effectiveType === "4g";
}
