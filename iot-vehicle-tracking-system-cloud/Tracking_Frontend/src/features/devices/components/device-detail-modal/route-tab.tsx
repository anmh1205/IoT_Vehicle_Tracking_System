'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarRange, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { SESSION_STATUS_LABELS } from '@/features/devices/components/device-constants';
import { deviceDetailServices } from '@/lib/api/device-detail';
import { formatDateTime, formatDuration, formatNumber } from '@/lib/utils/date/format';
import { useDeviceDetailModal } from './modal-context';
import { RouteReplayMap } from './route-replay-map';
import type { DeviceSession, DeviceTelemetryRow } from '@/features/devices/types';
import {
  buildRouteReplayPoints,
  countRouteReplayPointsForSession,
  filterTelemetryRowsBySession,
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

const PLAYBACK_RATE_OPTIONS = [1, 2, 4] as const;
const EMPTY_TELEMETRY_ROWS: DeviceTelemetryRow[] = [];

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

const getSessionGpsPointCount = (session: DeviceSession) =>
  Math.max(0, Number(session.gpsPointsCount ?? session.dataPointsCount ?? 0));

const toShortDateLabel = (value: string) => {
  if (!value) {
    return '';
  }

  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

const toOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toSessionTelemetryRows = (payload: any): DeviceTelemetryRow[] => {
  const items = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data?.items)
        ? payload.data.items
        : [];

  return items
    .map((row: any): DeviceTelemetryRow => ({
      timestamp: String(row?.timestamp ?? ''),
      latitude: toOptionalNumber(row?.latitude),
      longitude: toOptionalNumber(row?.longitude),
      speed: toOptionalNumber(row?.speed),
      deviceBattery: toOptionalNumber(row?.deviceBattery ?? row?.device_battery),
      vehicleBattery: toOptionalNumber(row?.vehicleBattery ?? row?.vehicle_battery),
      temperature: toOptionalNumber(row?.temperature),
      engineTemperature: toOptionalNumber(row?.engineTemperature ?? row?.engine_temperature),
      errorCode: toOptionalNumber(row?.errorCode ?? row?.error_code),
      imuAccelDeltaMps2: toOptionalNumber(row?.imuAccelDeltaMps2 ?? row?.imu_accel_delta_mps2),
    }))
    .filter((row: DeviceTelemetryRow) => row.timestamp.length > 0)
    .sort(
      (left: DeviceTelemetryRow, right: DeviceTelemetryRow) =>
        Date.parse(left.timestamp) - Date.parse(right.timestamp),
    );
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
  const [playbackRate, setPlaybackRate] = useState<(typeof PLAYBACK_RATE_OPTIONS)[number]>(2);
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [customRangeDraft, setCustomRangeDraft] = useState(trackingCustomRange);
  const sessionsListRef = useRef<HTMLDivElement | null>(null);
  const hasStartedReplayRef = useRef(false);

  useEffect(() => {
    setCustomRangeDraft(trackingCustomRange);
  }, [trackingCustomRange]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  );
  const selectedSessionTelemetry = useQuery({
    queryKey: ['device-session-telemetry', device?.id ?? null, selectedSessionId],
    queryFn: () =>
      deviceDetailServices
        .getSessionTelemetry(device!.id, selectedSessionId!)
        .then(toSessionTelemetryRows),
    enabled: Boolean(device?.id && selectedSessionId),
    staleTime: 5000,
  });

  const replayPointCountBySession = useMemo(() => {
    const entries: Array<[number, number]> = sessions.map((session) => [
      session.id,
      countRouteReplayPointsForSession(trackingRowsAscending, session),
    ]);
    return new Map<number, number>(entries);
  }, [sessions, trackingRowsAscending]);

  useEffect(() => {
    if (sessions.length === 0) {
      setSelectedSessionId(null);
      return;
    }

    const preferredSessionId =
      sessions.find((session) => {
        const replayPointCount = replayPointCountBySession.get(session.id) ?? 0;
        return Math.max(replayPointCount, getSessionGpsPointCount(session)) > 0;
      })?.id ?? sessions[0].id;

    setSelectedSessionId((current) =>
      current !== null && sessions.some((session) => session.id === current) ? current : preferredSessionId,
    );
  }, [sessions, replayPointCountBySession]);

  const selectedRawRows = selectedSessionTelemetry.data ?? EMPTY_TELEMETRY_ROWS;
  const selectedRows = useMemo(() => {
    if (selectedSessionTelemetry.isFetched || selectedRawRows.length > 0) {
      return selectLatestContiguousRouteRows(selectedRawRows);
    }

    return selectLatestContiguousRouteRows(
      filterTelemetryRowsBySession(trackingRowsAscending, selectedSession),
    );
  }, [selectedRawRows, selectedSession, selectedSessionTelemetry.isFetched, trackingRowsAscending]);
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
  const selectedRecordedGpsPointCount = selectedSession ? getSessionGpsPointCount(selectedSession) : 0;
  const selectedRawRowCount = selectedSessionTelemetry.isFetched ? selectedRawRows.length : 0;
  const pointTimeLabel = infoPoint?.timestamp ? formatDateTime(infoPoint.timestamp, 'HH:mm:ss dd/MM') : '-';
  const pointCoordinateLabel = infoPoint
    ? formatCoordinateLabel(infoPoint.latitude, infoPoint.longitude, 6)
    : '-';
  const pointSpeedLabel =
    infoPoint?.speed !== null && infoPoint?.speed !== undefined
      ? `${formatNumber(infoPoint.speed)} km/h`
      : '-';
  const startPointLabel = firstPoint ? formatDateTime(firstPoint.timestamp, 'HH:mm dd/MM') : 'Chưa có mốc đầu';
  const endPointLabel = lastPoint ? formatDateTime(lastPoint.timestamp, 'HH:mm dd/MM') : 'Chưa có mốc cuối';
  const coverageLabel = coverageSeconds > 0 ? formatDuration(coverageSeconds) : 'Chưa đủ dữ liệu';
  const selectedSessionWindowLabel = selectedSession
    ? `${selectedSession.serverSessionStart ? formatDateTime(selectedSession.serverSessionStart, 'HH:mm dd/MM') : 'Chưa có mốc bắt đầu'} - ${
        selectedSession.serverSessionEnd ? formatDateTime(selectedSession.serverSessionEnd, 'HH:mm dd/MM') : 'Đang chạy'
      }`
    : 'Chọn một phiên bên trái để phát lại lộ trình.';
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
  const replayHeadline =
    replayPoints.length > 0
      ? replaySummary
      : selectedRecordedGpsPointCount > 0
        ? selectedSessionTelemetry.isFetching
          ? 'Đã ghi nhận GPS trên server, đang tải dữ liệu phát lại'
          : 'Đã ghi nhận GPS trên server nhưng chưa dựng được đoạn phát lại liên tục'
        : selectedRawRowCount > 0
        ? 'Phiên có rawdata nhưng GNSS chưa có fix hợp lệ'
        : fallbackLivePoint
        ? 'Phiên hiện chỉ có điểm live hiện tại, chưa đủ dữ liệu để phát lại'
        : 'Chưa có mốc GPS để phát lại';

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
                const replayPointCount = replayPointCountBySession.get(session.id) ?? 0;
                const recordedGpsPointCount = getSessionGpsPointCount(session);
                const displayPointCount = Math.max(replayPointCount, recordedGpsPointCount);
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
                        {SESSION_STATUS_LABELS[session.status] ?? session.status}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-muted-foreground">
                      <p>
                        <span className="block uppercase tracking-[0.14em]">Thời lượng</span>
                        <span className="mt-1 block font-medium text-foreground">{formatDuration(durationSeconds)}</span>
                      </p>
                      <p>
                        <span className="block uppercase tracking-[0.14em]">Điểm GPS</span>
                        <span className="mt-1 block font-medium text-foreground">{formatNumber(displayPointCount)} điểm</span>
                      </p>
                    </div>

                    {displayPointCount === 0 ? (
                      <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-200">
                        Phiên này chưa có điểm GPS hợp lệ trong hệ thống.
                      </p>
                    ) : replayPointCount === 0 ? (
                      <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-200">
                        Đã ghi nhận GPS trên server. Nếu chưa phát lại được, chờ đồng bộ hoặc mở dải {zeroTelemetryRangeLabel}.
                      </p>
                    ) : replayPointCount === 1 ? (
                      <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-200">
                        Phiên này mới có 1 điểm GPS hợp lệ, chưa đủ để phát lại lộ trình.
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
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold">Bản đồ hoạt động và phát lại lộ trình</p>
              <p className="mt-1 text-xs text-muted-foreground">{selectedSessionWindowLabel}</p>
            </div>
            {selectedSession ? (
              <Badge variant={SESSION_BADGE_VARIANTS[selectedSession.status] ?? 'outline'}>
                {SESSION_STATUS_LABELS[selectedSession.status] ?? selectedSession.status}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 p-4">
          <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-h-[24rem] overflow-hidden rounded-2xl border bg-muted/10 xl:min-h-0">
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
            </div>

            <aside className="flex min-h-0 flex-col gap-4">
              <div className="rounded-2xl border bg-muted/10 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Tóm tắt phát lại
                </p>
                <p className="mt-2 text-sm font-semibold">{replayHeadline}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-xl border bg-background px-3 py-2">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Bao phủ</p>
                    <p className="mt-1 text-sm font-semibold">{coverageLabel}</p>
                  </div>
                  <div className="rounded-xl border bg-background px-3 py-2">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Mốc hiện tại</p>
                    <p className="mt-1 text-sm font-semibold">{pointTimeLabel}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <div className="grid gap-3">
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      aria-label="Về đầu phần phát lại"
                      onClick={() => {
                        hasStartedReplayRef.current = true;
                        setCursor(0);
                        setIsPlaying(false);
                      }}
                      disabled={replayPoints.length === 0}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={isPlaying ? 'secondary' : 'default'}
                      aria-label={isPlaying ? 'Tạm dừng phát lại' : 'Phát lại'}
                      onClick={handlePlayPause}
                      disabled={replayPoints.length <= 1}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      aria-label="Về cuối phần phát lại"
                      onClick={() => {
                        hasStartedReplayRef.current = true;
                        setCursor(replayMax);
                        setIsPlaying(false);
                      }}
                      disabled={replayPoints.length === 0}
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Tốc độ phát</span>
                    {PLAYBACK_RATE_OPTIONS.map((rate) => (
                      <Button
                        key={rate}
                        type="button"
                        size="sm"
                        variant={playbackRate === rate ? 'default' : 'outline'}
                        className="h-8 px-3 text-xs"
                        onClick={() => setPlaybackRate(rate)}
                      >
                        {rate}x
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
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
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span className="truncate">{startPointLabel}</span>
                  <span className="truncate text-right">{endPointLabel}</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {replayInfoRows.map((row) => (
                  <div key={row.label} className="rounded-2xl border bg-background px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{row.label}</p>
                    <p className="mt-2 break-words text-sm font-semibold">{row.value}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
};
