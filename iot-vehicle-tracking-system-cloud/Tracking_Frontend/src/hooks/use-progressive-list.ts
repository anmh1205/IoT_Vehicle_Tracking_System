import { useEffect, useMemo, useState } from 'react';

export const useProgressiveList = <T>(
  items: T[],
  options?: {
    pageSize?: number;
    resetKey?: unknown;
  },
) => {
  const pageSize = options?.pageSize ?? 20;
  const resetKey = options?.resetKey;
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize, resetKey]);

  const visibleItems = useMemo(
    () => items.slice(0, Math.max(visibleCount, pageSize)),
    [items, pageSize, visibleCount],
  );

  const totalCount = items.length;
  const loadedCount = visibleItems.length;
  const hasMore = loadedCount < totalCount;

  const loadMore = () => {
    setVisibleCount((current) => Math.min(current + pageSize, totalCount));
  };

  return {
    items: visibleItems,
    totalCount,
    loadedCount,
    hasMore,
    loadMore,
  };
};
