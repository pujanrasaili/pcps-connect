import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";

// How many students are waiting on each club the signed-in staff member
// manages ({ [clubId]: n }). Best-effort: a failure just means no badges.
export function useRequestCounts(enabled = true) {
  const [counts, setCounts] = useState({});
  const reload = useCallback(() => {
    if (!enabled) return;
    api
      .get("/admin/club-request-counts", { quiet: true })
      .then((res) => setCounts(res.data.counts || {}))
      .catch(() => {});
  }, [enabled]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { counts, reload };
}
