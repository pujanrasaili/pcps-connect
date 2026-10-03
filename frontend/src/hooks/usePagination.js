import { useEffect, useState } from "react";

// Slices a list into pages of `pageSize` items. Resets to page 1 whenever
// the underlying item count changes (e.g. a new search/filter is applied).
export function usePagination(items, pageSize) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [items.length]);

  const pageItems = items.slice((page - 1) * pageSize, page * pageSize);

  return { page, setPage, totalPages, pageItems };
}
