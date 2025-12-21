'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { dashboardServices } from '@/lib/api/dashboard';
import { notificationUtils } from '@/lib/notification';
import { useInfiniteScrollSentinel } from '@/hooks/useInfiniteScrollSentinel';
import { NotificationsStats } from './components/NotificationsStats';
import { NotificationsFilters } from './components/NotificationsFilters';
import { NotificationsList } from './components/NotificationsList';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

type LocalAlertItem = Dashboard.AlertItemDto & { read?: boolean };
type LevelFilter = 'all' | 'error' | 'warning' | 'info';

export default function NotificationsPage() {
  const [items, setItems] = useState<LocalAlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LevelFilter>('all');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);
  const [scrollRootEl, setScrollRootEl] = useState<HTMLDivElement | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardServices.getAlerts();
      setItems(data.map((d) => ({ ...d, read: false })));
    } catch (e: any) {
      const errorMsg = e?.message || 'Lỗi tải thông báo';
      setError(errorMsg);
      notificationUtils.error('Lỗi tải thông báo', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (filter !== 'all') {
      list = list.filter((item) => item.level === filter);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((item) => item.code.toLowerCase().includes(s));
    }
    return list;
  }, [items, filter, search]);

  useEffect(() => {
    setVisibleCount(20);
  }, [filter, search]);

  const visibleItems = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const canLoadMore = visibleCount < filtered.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + 20, filtered.length));
  }, [filtered.length]);

  const loadMoreRef = useInfiniteScrollSentinel(handleLoadMore, {
    enabled: !loading && canLoadMore,
    root: scrollRootEl,
    threshold: 0.5
  });

  const unreadCount = items.filter((item) => !item.read).length;

  const markAsRead = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
    notificationUtils.success('Đã đánh dấu đã đọc');
  };

  const markAllAsRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    notificationUtils.success('Đã đánh dấu tất cả đã đọc');
  };

  const deleteAlert = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    notificationUtils.success('Đã ẩn thông báo');
  };

  const resetFilters = () => {
    setSearch('');
    setFilter('all');
    setVisibleCount(20);
  };

  return (
    <PageContainer pageTitle='Thông báo' pageDescription='Danh sách cảnh báo và bộ lọc theo mức độ' scrollable>
      <NotificationsStats items={items} unreadCount={unreadCount} />

      <NotificationsFilters
        search={search}
        filter={filter}
        onSearch={setSearch}
        onFilter={(val) => {
          setFilter(val);
          setVisibleCount(20);
        }}
        onReset={resetFilters}
        onMarkAllAsRead={markAllAsRead}
        unreadCount={unreadCount}
      />

      {error && (
        <Alert variant='destructive' className='mb-4'>
          <AlertTitle>Lỗi tải dữ liệu</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Danh sách thông báo</CardTitle>
        </CardHeader>
          <CardContent className='p-0'>
            <div ref={(el) => setScrollRootEl(el)} className='max-h-[560px] overflow-y-auto'>
              <NotificationsList
                items={visibleItems}
                loading={loading}
                onMarkRead={markAsRead}
                onDelete={(id) => setConfirmDeleteId(id)}
              />
              <div ref={loadMoreRef} className='h-8 w-full' />
              {canLoadMore && (
                <div className='p-3 text-center text-xs text-muted-foreground'>
                  Cuộn xuống để tải thêm thông báo...
                </div>
              )}
            </div>
          </CardContent>
        <CardFooter className='flex items-center justify-between gap-2 text-xs text-muted-foreground'>
          <div>
            Đang hiển thị {Math.min(visibleCount, filtered.length)}/{filtered.length} thông báo
          </div>
        </CardFooter>
      </Card>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title='Ẩn thông báo'
        description='Bạn có chắc muốn ẩn thông báo này khỏi danh sách không?'
        variant='destructive'
        confirmLabel='Ẩn'
        cancelLabel='Hủy'
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (!confirmDeleteId) return;
          deleteAlert(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
      />
    </PageContainer>
  );
}
