// Rules for keeping "Save for later" bookmarks in step with the account.
// The server only accepts 24-character hex event ids, so anything else stays
// on this device and is never sent.
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const MAX_SAVED = 200;

export const syncable = (ids) => ids.filter((id) => OBJECT_ID.test(id));

export const sameList = (a, b) => a.length === b.length && a.every((id, i) => id === b[i]);

// The first time a device meets an account, nothing is lost: what was saved
// here before logging in joins what the account already has (here first, as
// it is newest). After that the account is the source of truth, so an event
// unsaved on the phone is not brought back by a laptop's stale list.
export function mergeSaved(local, server, firstSyncOnDevice) {
  if (!firstSyncOnDevice) return server.slice(0, MAX_SAVED);
  return [...new Set([...syncable(local), ...server])].slice(0, MAX_SAVED);
}
