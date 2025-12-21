'use client';

import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber } from '@/lib/utils/number';
import { formatHours } from '../device-utils';
import { useDeviceRuntimeRealtime } from '@/hooks/useDeviceRuntimeRealtime';
import { DEVICE_SHADOWS, DEVICE_ANIMATIONS, DEVICE_RADIUS } from '../device-design-constants';
import { useCallback, useState } from 'react';
import { useInfiniteScrollSentinel } from '@/hooks/useInfiniteScrollSentinel';
import { Database, Clock, Timer, Activity, TrendingUp, Hash } from 'lucide-react';
import { EmptyState } from './EmptyState';

function formatDateTime(timestamp: string) {
  // Split into time and date for better readability
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return { time, date: dateStr };
}

export function DeviceDetailSessionsTab({
  sessions,
  hasMore,
  loadingMore,
  onLoadMore,
  deviceId,
  currentStatus,
  lastSeenAt
}: {
  sessions: any[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  deviceId: string;
  currentStatus?: string | null;
  lastSeenAt?: string | null;
}) {
  const runningSession = sessions.find((s) => s.session_end === null);
  const [scrollRootEl, setScrollRootEl] = useState<HTMLDivElement | null>(null);
  const { currentSessionRuntime } = useDeviceRuntimeRealtime({
    baseQuarterRuntime: 0,
    baseTotalRuntime: 0,
    currentStatus: runningSession ? (currentStatus as 'running' | 'disconnected' | 'stopped' | null) ?? null : null,
    lastSeenAt: runningSession ? lastSeenAt ?? null : null,
    sessionStart: runningSession?.session_start ?? null
  });

  const handleLoadMore = useCallback(() => {
    if (!hasMore) return;
    if (loadingMore) return;
    onLoadMore();
  }, [hasMore, loadingMore, onLoadMore]);

  const loadMoreRef = useInfiniteScrollSentinel(handleLoadMore, {
    enabled: hasMore && !loadingMore,
    root: scrollRootEl,
    threshold: 0.5
  });

  if (!sessions || sessions.length === 0) {
    return (
      <div className='space-y-4'>
        <div className='text-sm font-semibold'>Phiên chạy</div>
        <EmptyState message='Không có dữ liệu phiên chạy' icon='database' />
      </div>
    );
  }

  return (
    <div className='flex h-full flex-1 flex-col space-y-4'>
      <div className='text-sm font-semibold'>Phiên chạy</div>

      <div className={`flex-1 min-h-0 flex flex-col ${DEVICE_RADIUS.md} border border-border ${DEVICE_SHADOWS.card} overflow-hidden`}>
        <div ref={(el) => setScrollRootEl(el)} className='flex-1 min-h-0 overflow-y-scroll relative'>
          {/* Sticky Header - Inside scrollable container */}
          <div className='sticky top-0 z-20 bg-muted shadow-md border-b-2 border-border'>
            <Table className='table-fixed w-full'>
              <TableHeader>
                <TableRow className='hover:bg-muted'>
                  <TableHead className='font-semibold text-center w-[80px] text-foreground'>
                    <div className='flex items-center justify-center gap-1.5'>
                      <Hash className='h-4 w-4 text-foreground/70' />
                      ID
                    </div>
                  </TableHead>
                  <TableHead className='font-semibold text-center w-[140px] text-foreground'>
                    <div className='flex items-center justify-center gap-1.5'>
                      <Clock className='h-4 w-4 text-foreground/70' />
                      Bắt đầu
                    </div>
                  </TableHead>
                  <TableHead className='font-semibold text-center w-[140px] text-foreground'>
                    <div className='flex items-center justify-center gap-1.5'>
                      <Clock className='h-4 w-4 text-foreground/70' />
                      Kết thúc
                    </div>
                  </TableHead>
                  <TableHead className='font-semibold text-center w-[110px] text-foreground'>
                    <div className='flex items-center justify-center gap-1.5'>
                      <Timer className='h-4 w-4 text-foreground/70' />
                      Thời gian
                    </div>
                  </TableHead>
                  <TableHead className='font-semibold text-center w-[100px] text-foreground'>
                    <div className='flex items-center justify-center gap-1.5'>
                      <Activity className='h-4 w-4 text-foreground/70' />
                      Rung TB
                    </div>
                  </TableHead>
                  <TableHead className='font-semibold text-center w-[110px] text-foreground'>
                    <div className='flex items-center justify-center gap-1.5'>
                      <TrendingUp className='h-4 w-4 text-foreground/70' />
                      Đỉnh rung
                    </div>
                  </TableHead>
                  <TableHead className='font-semibold text-center w-[90px] text-foreground'>
                    <div className='flex items-center justify-center gap-1.5'>
                      <Database className='h-4 w-4 text-foreground/70' />
                      Số mẫu
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
            </Table>
          </div>

          {/* Scrollable Body */}
          <Table className='table-fixed w-full'>
            <TableBody>
            {sessions.map((s, idx) => {
              const isRunning = s.session_end === null;
              const rowBg = idx % 2 === 0 ? 'bg-background' : 'bg-muted/30';
              const startDT = formatDateTime(s.session_start);
              const endDT = s.session_end ? formatDateTime(s.session_end) : null;
              return (
                <TableRow
                  key={`${s.id}-${s.session_start}-${s.session_end ?? 'open'}`}
                  className={`${isRunning ? 'bg-emerald-500/5' : rowBg} ${DEVICE_ANIMATIONS.transition.normal} hover:bg-primary/8 ${
                    isRunning ? 'border-l-4 border-l-emerald-500' : ''
                  }`}
                >
                  <TableCell className='text-center w-[80px]'>
                    <Badge variant='secondary' className='text-xs font-mono font-medium px-2 py-0.5'>
                      #{s.id}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-center w-[140px]'>
                    <div className='flex flex-col gap-0.5 items-center'>
                      <span className='text-sm font-semibold tabular-nums text-foreground'>{startDT.time}</span>
                      <span className='text-xs text-foreground/70 tabular-nums'>{startDT.date}</span>
                    </div>
                  </TableCell>
                  <TableCell className='text-center w-[140px]'>
                    {endDT ? (
                      <div className='flex flex-col gap-0.5 items-center'>
                        <span className='text-sm font-semibold tabular-nums text-foreground'>{endDT.time}</span>
                        <span className='text-xs text-foreground/70 tabular-nums'>{endDT.date}</span>
                      </div>
                    ) : (
                      <Badge
                        variant='outline'
                        className='text-xs font-semibold border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      >
                        Đang chạy
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className='text-center font-semibold tabular-nums w-[110px] text-foreground'>
                    {s.session_end === null && currentSessionRuntime > 0
                      ? formatHours(currentSessionRuntime)
                      : formatHours(s.total_runtime_seconds)}
                  </TableCell>
                  <TableCell className='text-center tabular-nums w-[100px] text-foreground'>
                    {s.session_end === null && runningSession?.avg_vibration != null
                      ? formatNumber(runningSession.avg_vibration, 2)
                      : s.avg_vibration != null
                      ? formatNumber(s.avg_vibration, 2)
                      : '—'}
                  </TableCell>
                  <TableCell className='text-center tabular-nums w-[110px] text-foreground'>
                    {s.session_end === null && runningSession?.max_vibration != null
                      ? formatNumber(runningSession.max_vibration, 2)
                      : s.max_vibration != null
                      ? formatNumber(s.max_vibration, 2)
                      : '—'}
                  </TableCell>
                  <TableCell className='text-center tabular-nums w-[90px] text-foreground'>
                    {s.session_end === null && runningSession?.data_points_count != null
                      ? runningSession.data_points_count
                      : s.data_points_count ?? '—'}
                  </TableCell>
                </TableRow>
              );
            })}
            </TableBody>
          </Table>
          <div ref={loadMoreRef} className='h-10 w-full' />
          {loadingMore && (
            <div className='pb-4 text-center text-xs text-muted-foreground'>Đang tải thêm phiên chạy...</div>
          )}
          {!loadingMore && hasMore && (
            <div className='pb-4 text-center text-xs text-muted-foreground'>Cuộn xuống để tải thêm phiên chạy...</div>
          )}
        </div>
      </div>
    </div>
  );
}

