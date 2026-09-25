'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InfiniteScrollTriggerProps {
  hasMore: boolean;
  isLoadingMore?: boolean;
  onLoadMore: () => void;
  loadedCount: number;
  totalCount: number;
  itemLabel?: string;
}

export const InfiniteScrollTrigger = ({
  hasMore,
  isLoadingMore = false,
  onLoadMore,
  loadedCount,
  totalCount,
  itemLabel = 'bản ghi',
}: InfiniteScrollTriggerProps) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || isLoadingMore || !sentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '240px 0px' },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  if (totalCount === 0 && !hasMore) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
      <p className="text-sm text-muted-foreground">
        Đã tải {loadedCount} / {totalCount} {itemLabel}.
      </p>

      {hasMore ? (
        <div ref={sentinelRef} className="flex items-center justify-center">
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoadingMore ? 'Đang tải thêm' : 'Tải thêm'}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Đã hiển thị hết dữ liệu phù hợp.</p>
      )}
    </div>
  );
};
