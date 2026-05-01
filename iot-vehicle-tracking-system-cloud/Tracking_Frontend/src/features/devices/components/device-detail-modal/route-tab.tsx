'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { DEVICE_STATUS_LABELS } from '@/features/devices/components/device-constants';
import type { DeviceSession, DeviceTelemetryRow } from '@/features/devices/types';
import { formatDateTime, formatDuration, formatNumber } from '@/lib/utils/date/format';
import { useDeviceDetailModal } from './modal-context';
import { RouteReplayMap } from './route-replay-map';
import {
  buildRouteReplayPoints,
  formatCoordinateLabel,
  hasValidTelemetryCoordinates,
  selectLatestContiguousRouteRows,
} from './telemetry-insights';

const PERIOD_OPTIONS = [
  { label: '6 giờ', value: '6h' },
  { label: '24 giờ', value: '24h' },
  { label: '7 ngày', value: '7d' },
  { label: '30 ngày', value: '30d' },
  { label: '90 ngày', value: '90d' },
] as const;

const PERIOD_LABELS: Record<(typeof PERIOD_OPTIONS)[number]['value'], string> = {
  '6h': '6 giờ',
  '24h': '24 giờ',
  '7d': '7 ngày',
  '30d': '30 ngày',
  '90d': '90 ngày',
};

const SESSION_BADGE_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  running: 'default',
  completed: 'secondary',
  disconnected: 'destructive',
};

const toTimestampMs = (value: string | null | undefined): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toDurationSeconds = (from: string | null | undefined, to: string | null | undefined) => {
  const start = toTimestampMs(from);
  const end = toTimestampMs(to);

  if (start === null || end === null || end <= start) {
    return 0;
  }

  return Math.round((end - start) / 1000);
};

const toShortDateLabel = (value: string) => {
  if (!value) {
    return '';
  }

  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

const filterRowsBySession = (rows: DeviceTelemetryRow[], session: DeviceSession | null) => {
  if (!session) {
    return rows;
  }

  const start = toTimestampMs(session.serverSessionStart);
  const end = toTimestampMs(session.serverSessionEnd);

  if (start === null) {
    return rows;
  }

  return rows.filter((row) => {
    const timestamp = toTimestampMs(row.timestamp);
    if (timestamp === null || timestamp < start) {
      return false;
    }

    if (end !== null && timestamp > end) {
      return false;
    }

    return true;
  });
};

export const RouteTab = () => {
  const {
    sessions,
    sessionsLoading,
    sessionsHasMore,
    onSessionsLoadMore,
    trackingRowsAscending,
    trackingPeriod,
    onTrackingPeriodChange,
    trackingCustomRange,
    onTrackingCustomRangeChange,
    positionSnapshot,
    device,
  } = useDeviceDetailModal();

  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [cursor, setCursor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackRate = 2;
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [customRangeDraft, setCustomRangeDraft] = useState(trackingCustomRange);
  const [isReplayPanelCollapsed, setIsReplayPanelCollapsed] = useState(false);
  const sessionsListRef = useRef<HTMLDivElement | null>(null);
  const hasStartedReplayRef = useRef(false);

  useEffect(() => {
    setCustomRangeDraft(trackingCustomRange);
  }, [trackingCustomRange]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  );

  const telemetryCountBySession = useMemo(() => {
    const entries: Array<[number, number]> = sessions.map((session) => [
      session.id,
      filterRowsBySession(trackingRowsAscending, session).length,
    ]);
    return new Map<number, number>(entries);
  }, [sessions, trackingRowsAscending]);

  useEffect(() => {
    if (sessions.length === 0) {
      setSelectedSessionId(null);
      return;
    }

    const preferredSessionId =
      sessions.find((session) => (telemetryCountBySession.get(session.id) ?? 0) > 0)?.id ?? sessions[0].id;

    setSelectedSessionId((current) =>
      current !== null && sessions.some((session) => session.id === current) ? current : preferredSessionId,
    );
  }, [sessions, telemetryCountBySession]);

  const selectedRows = useMemo(
    () => selectLatestContiguousRouteRows(filterRowsBySession(trackingRowsAscending, selectedSession)),
    [selectedSession, trackingRowsAscending],
  );
  const replayPoints = useMemo(() => buildRouteReplayPoints(selectedRows), [selectedRows]);
  const pathPoints = useMemo(
    () => replayPoints.map((point) => [point.latitude, point.longitude] as [number, number]),
    [replayPoints],
  );

  useEffect(() => {
    const nextCursor = replayPoints.length > 0 ? replayPoints.length - 1 : 0;
    hasStartedReplayRef.current = false;
    setCursor(nextCursor);
    setIsPlaying(false);
  }, [replayPoints.length, selectedSessionId, trackingPeriod]);

  useEffect(() => {
    if (!isPlaying || replayPoints.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setCursor((current) => {
        if (current >= replayPoints.length - 1) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, Math.max(250, Math.round(1200 / playbackRate)));

    return () => {
      window.clearInterval(timer);
    };
  }, [isPlaying, playbackRate, replayPoints.length]);

  const maybeLoadMoreSessions = useCallback(() => {
    const element = sessionsListRef.current;
    if (!element || !sessionsHasMore || sessionsLoading) {
      return;
    }

    const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (distanceToBottom <= 120) {
      onSessionsLoadMore();
    }
  }, [onSessionsLoadMore, sessionsHasMore, sessionsLoading]);

  useEffect(() => {
    maybeLoadMoreSessions();
  }, [maybeLoadMoreSessions, sessions.length]);

  const currentPoint = replayPoints.length > 0 ? replayPoints[Math.min(cursor, replayPoints.length - 1)] : null;
  const firstPoint = replayPoints[0] ?? null;
  const lastPoint = replayPoints.at(-1) ?? null;
  const coverageSeconds = toDurationSeconds(firstPoint?.timestamp, lastPoint?.timestamp);
  const fallbackLivePoint =
    selectedSession && (selectedSession.status === 'running' || !selectedSession.serverSessionEnd)
      ? hasValidTelemetryCoordinates(positionSnapshot?.latitude, positionSnapshot?.longitude)
        ? ([positionSnapshot!.latitude!, positionSnapshot!.longitude!] as [number, number])
        : hasValidTelemetryCoordinates(device?.latitude, device?.longitude)
          ? ([device!.latitude!, device!.longitude!] as [number, number])
          : null
      : null;
  const infoPoint = currentPoint ?? lastPoint ?? null;
  const currentPointLabel = replayPoints.length > 0 ? `${Math.min(cursor + 1, replayPoints.length)}/${replayPoints.length}` : '0/0';
  const replayMax = Math.max(replayPoints.length - 1, 0);
  const replaySummary = replayPoints.length > 0
    ? `${currentPointLabel}${currentPoint?.timestamp ? ` · ${formatDateTime(currentPoint.timestamp, 'HH:mm:ss dd/MM')}` : ''}`
    : 'Chưa có mốc GPS để phát lại';
  const pointTimeLabel = infoPoint?.timestamp ? formatDateTime(infoPoint.timestamp, 'HH:mm:ss dd/MM') : '-';
  const pointCoordinateLabel = infoPoint
    ? formatCoordinateLabel(infoPoint.latitude, infoPoint.longitude, 6)
    : '-';
  const pointSpeedLabel =
    infoPoint?.speed !== null && infoPoint?.speed !== undefined
      ? `${infoPoint.speed.toFixed(1)} km/h`
      : '-';
  const startPointLabel = firstPoint ? formatDateTime(firstPoint.timestamp, 'HH:mm dd/MM') : 'Chưa có mốc đầu';
  const endPointLabel = lastPoint ? formatDateTime(lastPoint.timestamp, 'HH:mm dd/MM') : 'Chưa có mốc cuối';
  const coverageLabel = coverageSeconds > 0 ? formatDuration(coverageSeconds) : 'Chưa đủ dữ liệu';
  const customRangeButtonLabel = trackingPeriod === 'custom'
    ? `${toShortDateLabel(trackingCustomRange.from)} - ${toShortDateLabel(trackingCustomRange.to)}`
    : 'Khoảng thời gian';
  const zeroTelemetryRangeLabel = trackingPeriod === 'custom'
    ? 'đã chọn'
    : PERIOD_LABELS[trackingPeriod];
  const replayInfoRows = [
    { label: 'Điểm', value: currentPointLabel },
    { label: 'Mốc hiện tại', value: pointTimeLabel },
    { label: 'Tọa độ', value: pointCoordinateLabel },
    { label: 'Tốc độ', value: pointSpeedLabel },
    { label: 'Bao phủ', value: coverageLabel },
    { label: 'Trạng thái', value: replayPoints.length > 0 ? replaySummary : 'Chưa có mốc GPS để phát lại' },
  ];

  const handlePlayPause = () => {
    if (replayPoints.length <= 1) {
      return;
    }

    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    setCursor((current) => {
      if (!hasStartedReplayRef.current || current >= replayMax) {
        return 0;
      }
      return current;
    });
    hasStartedReplayRef.current = true;
    setIsPlaying(true);
  };

  const applyCustomRange = () => {
    if (!customRangeDraft.from || !customRangeDraft.to) {
      return;
    }

    const nextRange =
      customRangeDraft.from <= customRangeDraft.to
        ? customRangeDraft
        : {
            from: customRangeDraft.to,
            to: customRangeDraft.from,
          };

    onTrackingCustomRangeChange(nextRange);
    onTrackingPeriodChange('custom');
    setCustomRangeOpen(false);
  };

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-background">
        <div className="border-b px-4 py-4">
          <p className="text-sm font-semibold">Phiên vận hành</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={trackingPeriod === option.value ? 'default' : 'outline'}
                className="h-8 px-3 text-xs"
                onClick={() => onTrackingPeriodChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
            <Popover open={customRangeOpen} onOpenChange={setCustomRangeOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant={trackingPeriod === 'custom' ? 'default' : 'outline'}
                  className="h-8 px-3 text-xs"
                >
                  <CalendarRange className="mr-2 h-4 w-4" />
                  {customRangeButtonLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(92vw,22rem)] space-y-4 p-4">
                <div>
                  <p className="text-sm font-semibold">Lọc theo khoảng thời gian</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Chọn khoảng ngày để xem đúng phiên và telemetry theo giai đoạn cần audit.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 text-xs font-medium">
                    <span>Từ ngày</span>
                    <Input
                      type="date"
                      value={customRangeDraft.from}
                      onChange={(event) =>
                        setCustomRangeDraft((current) => ({ ...current, from: event.target.value }))
                      }
                    />
                  </label>
                  <label className="space-y-1.5 text-xs font-medium">
                    <span>Đến ngày</span>
                    <Input
                      type="date"
                      value={customRangeDraft.to}
                      onChange={(event) =>
                        setCustomRangeDraft((current) => ({ ...current, to: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setCustomRangeDraft(trackingCustomRange)}>
                    Đặt lại
                  </Button>
                  <Button
                    size="sm"
                    onClick={applyCustomRange}
                    disabled={!customRangeDraft.from || !customRangeDraft.to}
                  >
                    Áp dụng
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div
          ref={sessionsListRef}
          className="min-h-0 flex-1 overflow-y-auto"
          onScroll={maybeLoadMoreSessions}
        >
          <div className="space-y-2 p-3">
            {sessionsLoading && sessions.length === 0 ? (
              <div className="rounded-xl border border-dashed px-3 py-6 text-sm text-muted-foreground">
                Đang tải danh sách phiên chạy...
              </div>
            ) : sessions.length > 0 ? (
              sessions.map((session) => {
                const selected = session.id === selectedSession?.id;
                const telemetryCount = telemetryCountBySession.get(session.id) ?? 0;
                const durationSeconds = session.uptime ?? toDurationSeconds(session.serverSessionStart, session.serverSessionEnd);

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${selected ? 'border-primary bg-primary/5 shadow-sm' : 'bg-background hover:bg-muted/20'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Phiên #{session.id}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {session.serverSessionStart
                            ? formatDateTime(session.serverSessionStart, 'HH:mm dd/MM')
                            : 'Chưa có mốc bắt đầu'}{' '}
                          -{' '}
                          {session.serverSessionEnd
                            ? formatDateTime(session.serverSessionEnd, 'HH:mm dd/MM')
                            : 'Đang chạy'}
                        </p>
                      </div>
                      <Badge variant={SESSION_BADGE_VARIANTS[session.status] ?? 'outline'}>
                        {DEVICE_STATUS_LABELS[session.status] ?? session.status}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-muted-foreground">
                      <p>
                        <span className="block uppercase tracking-[0.14em]">Thời lượng</span>
                        <span className="mt-1 block font-medium text-foreground">{formatDuration(durationSeconds)}</span>
                      </p>
                      <p>
                        <span className="block uppercase tracking-[0.14em]">Dữ liệu trong kỳ</span>
                        <span className="mt-1 block font-medium text-foreground">{formatNumber(telemetryCount)} điểm</span>
                      </p>
                    </div>

                    {telemetryCount === 0 ? (
                      <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-200">
                        Phiên này chưa có telemetry trong dải {zeroTelemetryRangeLabel}. Thử mở dải thời gian lớn hơn.
                      </p>
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed px-3 py-6 text-sm text-muted-foreground">
                Chưa có phiên chạy nào để đối chiếu lộ trình.
              </div>
            )}

            {sessionsLoading && sessions.length > 0 ? (
              <div className="rounded-xl border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">
                Đang tải thêm phiên...
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-background">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Bản đồ hoạt động và phát lại lộ trình</p>
        </div>

        <div className="min-h-0 flex-1 p-4">
          <div className="relative h-full overflow-hidden rounded-2xl border bg-muted/10">
            {replayPoints.length === 0 && !fallbackLivePoint ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                {selectedSession
                  ? 'Phiên đang chọn chưa có dữ liệu tọa độ hợp lệ trong dải thời gian hiện tại.'
                  : 'Chưa có dữ liệu tọa độ hợp lệ để hiển thị bản đồ hoạt động.'}
              </div>
            ) : (
              <RouteReplayMap
                pathPoints={pathPoints}
                currentPoint={currentPoint}
                livePoint={fallbackLivePoint}
              />
            )}

            <div
              className={`absolute inset-y-0 right-0 z-[520] transition-[width] duration-200 ${isReplayPanelCollapsed ? 'w-12' : 'w-[208px] sm:w-[224px]'}`}
            >
              <div className="flex h-full w-full flex-col border-l bg-background/95 shadow-lg backdrop-blur">
                <div className="flex items-center justify-between border-b px-2 py-2">
                  {!isReplayPanelCollapsed ? (
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Phát lại
                    </p>
                  ) : (
                    <span className="sr-only">Phát lại</span>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    aria-label={isReplayPanelCollapsed ? 'Mở rộng bảng phát lại' : 'Thu gọn bảng phát lại'}
                    onClick={() => setIsReplayPanelCollapsed((value) => !value)}
                  >
                    {isReplayPanelCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>

                {!isReplayPanelCollapsed ? (
                  <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
                    <div className="grid grid-cols-3 gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-1"
                        aria-label="Về đầu phần phát lại"
                        onClick={() => {
                          hasStartedReplayRef.current = true;
                          setCursor(0);
                          setIsPlaying(false);
                        }}
                        disabled={replayPoints.length === 0}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={isPlaying ? 'secondary' : 'default'}
                        className="h-7 px-1"
                        aria-label={isPlaying ? 'Tạm dừng phát lại' : 'Phát lại'}
                        onClick={handlePlayPause}
                        disabled={replayPoints.length <= 1}
                      >
                        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-1"
                        aria-label="Về cuối phần phát lại"
                        onClick={() => {
                          hasStartedReplayRef.current = true;
                          setCursor(replayMax);
                          setIsPlaying(false);
                        }}
                        disabled={replayPoints.length === 0}
                      >
                        <SkipForward className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="rounded-md border bg-background/70 px-2 py-1.5">
                      <Slider
                        min={0}
                        max={replayMax}
                        step={1}
                        value={[Math.min(cursor, replayMax)]}
                        onValueChange={(value) => {
                          hasStartedReplayRef.current = true;
                          setIsPlaying(false);
                          setCursor(value[0] ?? 0);
                        }}
                        disabled={replayPoints.length <= 1}
                      />
                      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                        <span className="truncate">{startPointLabel}</span>
                        <span className="truncate text-right">{endPointLabel}</span>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto rounded-md border bg-background/70">
                      <table className="w-full table-fixed text-[11px]">
                        <tbody>
                          {replayInfoRows.map((row) => (
                            <tr key={row.label} className="border-b last:border-b-0">
                              <th className="w-[40%] px-2 py-1.5 text-left font-medium text-muted-foreground">
                                {row.label}
                              </th>
                              <td className="px-2 py-1.5 text-right font-semibold text-foreground">
                                <span className="break-words">{row.value}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center px-1">
                    <p className="-rotate-90 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Phát lại
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
