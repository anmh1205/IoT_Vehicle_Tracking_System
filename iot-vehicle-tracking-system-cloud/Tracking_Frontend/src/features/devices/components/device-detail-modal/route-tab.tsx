'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { formatDateTime, formatDuration, formatNumber, formatRelative } from '@/lib/utils/date/format';
import { useDeviceDetailModal } from './modal-context';
import { RouteReplayMap } from './route-replay-map';
import {
  buildRouteReplayPoints,
  formatCoordinateLabel,
  formatSecondsLabel,
  getFreshnessSeconds,
  getObservedCadenceSeconds,
  getTelemetryFreshnessState,
  hasValidTelemetryCoordinates,
} from './telemetry-insights';

const PERIOD_OPTIONS = [
  { label: '6 giờ', value: '6h' },
  { label: '24 giờ', value: '24h' },
  { label: '7 ngày', value: '7d' },
] as const;

const PLAYBACK_SPEEDS = [
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '4x', value: 4 },
] as const;

const TELEMETRY_STATE_META = {
  healthy: { label: 'Đúng nhịp', variant: 'default' as const },
  warning: { label: 'Bắt đầu trễ', variant: 'secondary' as const },
  stale: { label: 'Trễ rõ rệt', variant: 'outline' as const },
  offline: { label: 'Mất tín hiệu', variant: 'destructive' as const },
  unknown: { label: 'Chưa đủ dữ liệu', variant: 'outline' as const },
};

const formatBatteryMetric = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-';
  }
  const unit = value > 24 ? '%' : 'V';
  return `${value.toFixed(1)}${unit}`;
};

const toDurationSeconds = (from: string | null | undefined, to: string | null | undefined) => {
  if (!from || !to) {
    return 0;
  }

  const start = Date.parse(from);
  const end = Date.parse(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }

  return Math.round((end - start) / 1000);
};

const StatTile = ({ label, value, helper }: { label: string; value: string; helper?: string }) => (
  <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 text-lg font-semibold">{value}</p>
    {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
  </div>
);

export const RouteTab = () => {
  const {
    routePoints,
    distanceKm,
    averageSpeed,
    maxSpeed,
    latestTrackingRow,
    positionSnapshot,
    trackingRowsAscending,
    trackingPeriod,
    onTrackingPeriodChange,
    device,
  } = useDeviceDetailModal();

  const replayPoints = useMemo(() => buildRouteReplayPoints(trackingRowsAscending), [trackingRowsAscending]);
  const [cursor, setCursor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<(typeof PLAYBACK_SPEEDS)[number]['value']>(2);

  useEffect(() => {
    const nextCursor = replayPoints.length > 0 ? replayPoints.length - 1 : 0;
    setCursor(nextCursor);
    setIsPlaying(false);
  }, [replayPoints.length, trackingPeriod]);

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

  const currentPoint = replayPoints.length > 0 ? replayPoints[Math.min(cursor, replayPoints.length - 1)] : null;
  const livePoint =
    hasValidTelemetryCoordinates(positionSnapshot?.latitude, positionSnapshot?.longitude)
      ? ([positionSnapshot!.latitude!, positionSnapshot!.longitude!] as [number, number])
      : hasValidTelemetryCoordinates(device?.latitude, device?.longitude)
        ? ([device!.latitude!, device!.longitude!] as [number, number])
        : null;

  const observedCadence = getObservedCadenceSeconds(trackingRowsAscending);
  const latestTelemetryTimestamp = latestTrackingRow?.timestamp ?? positionSnapshot?.timestamp ?? null;
  const telemetryFreshness = getFreshnessSeconds(latestTelemetryTimestamp);
  const telemetryState = TELEMETRY_STATE_META[
    getTelemetryFreshnessState(telemetryFreshness, device?.requestInterval ?? 60)
  ];

  const firstPoint = replayPoints[0] ?? null;
  const lastPoint = replayPoints.at(-1) ?? null;
  const coverageSeconds = toDurationSeconds(firstPoint?.timestamp, lastPoint?.timestamp);
  const pointLabel = currentPoint
    ? `${Math.min(cursor + 1, replayPoints.length)}/${replayPoints.length}`
    : '0/0';
  const waypointPreview = replayPoints.slice(-6).reverse();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Bản đồ hoạt động và replay lộ trình</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Xem vị trí hiện tại, tua lại các mốc GPS và kiểm tra nhịp gửi trên cùng một màn hình.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  variant={trackingPeriod === option.value ? 'default' : 'outline'}
                  onClick={() => onTrackingPeriodChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
            <StatTile label="Quãng đường" value={`${distanceKm.toFixed(2)} km`} />
            <StatTile label="Tốc độ TB" value={`${averageSpeed.toFixed(1)} km/h`} />
            <StatTile label="Tốc độ tối đa" value={`${maxSpeed.toFixed(1)} km/h`} />
            <StatTile label="Mốc GPS" value={formatNumber(replayPoints.length)} />
            <StatTile label="Nhịp quan sát" value={formatSecondsLabel(observedCadence)} />
            <StatTile label="Độ tươi" value={formatSecondsLabel(telemetryFreshness)} helper={telemetryState.label} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.45fr,0.95fr]">
            <div className="space-y-4">
              <div className="h-[420px] overflow-hidden rounded-2xl border bg-muted/10">
                {replayPoints.length === 0 && !livePoint ? (
                  <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
                    Chưa có dữ liệu tọa độ hợp lệ để hiển thị bản đồ hoạt động.
                  </div>
                ) : (
                  <RouteReplayMap pathPoints={routePoints} currentPoint={currentPoint} livePoint={livePoint} />
                )}
              </div>

              <div className="rounded-2xl border bg-muted/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Replay hành trình</p>
                    <p className="text-xs text-muted-foreground">
                      {replayPoints.length > 0
                        ? `Đang xem mốc ${pointLabel} · ${currentPoint ? formatDateTime(currentPoint.timestamp) : '-'}`
                        : 'Chưa có đủ waypoint để tua lại hành trình.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCursor(0);
                        setIsPlaying(false);
                      }}
                      disabled={replayPoints.length === 0}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Về đầu
                    </Button>
                    <Button
                      size="sm"
                      variant={isPlaying ? 'secondary' : 'default'}
                      onClick={() => setIsPlaying((value) => !value)}
                      disabled={replayPoints.length <= 1}
                    >
                      {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                      {isPlaying ? 'Tạm dừng' : 'Phát replay'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCursor(Math.max(replayPoints.length - 1, 0));
                        setIsPlaying(false);
                      }}
                      disabled={replayPoints.length === 0}
                    >
                      <SkipForward className="mr-2 h-4 w-4" />
                      Về hiện tại
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <Slider
                    min={0}
                    max={Math.max(replayPoints.length - 1, 0)}
                    step={1}
                    value={[Math.min(cursor, Math.max(replayPoints.length - 1, 0))]}
                    onValueChange={(value) => {
                      setIsPlaying(false);
                      setCursor(value[0] ?? 0);
                    }}
                    disabled={replayPoints.length <= 1}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{firstPoint ? formatDateTime(firstPoint.timestamp, 'HH:mm dd/MM') : 'Chưa có mốc đầu'}</span>
                    <span>{formatDuration(coverageSeconds)}</span>
                    <span>{lastPoint ? formatDateTime(lastPoint.timestamp, 'HH:mm dd/MM') : 'Chưa có mốc cuối'}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant={telemetryState.variant}>{telemetryState.label}</Badge>
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <Button
                      key={speed.value}
                      size="sm"
                      variant={playbackRate === speed.value ? 'default' : 'outline'}
                      className="h-8 px-2 text-xs"
                      onClick={() => setPlaybackRate(speed.value)}
                    >
                      {speed.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Điểm đang xem</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-1">
                  <StatTile
                    label="Thời điểm"
                    value={currentPoint ? `${formatDateTime(currentPoint.timestamp)} (${formatRelative(currentPoint.timestamp)})` : '-'}
                  />
                  <StatTile
                    label="Tọa độ"
                    value={currentPoint ? formatCoordinateLabel(currentPoint.latitude, currentPoint.longitude, 6) : formatCoordinateLabel(positionSnapshot?.latitude, positionSnapshot?.longitude, 6)}
                  />
                  <StatTile label="Tốc độ" value={currentPoint?.speed !== null && currentPoint?.speed !== undefined ? `${currentPoint.speed.toFixed(1)} km/h` : '-'} />
                  <StatTile
                    label="Pin / nhiệt độ"
                    value={`${formatBatteryMetric(currentPoint?.battery)} · ${currentPoint?.temperature !== null && currentPoint?.temperature !== undefined ? `${currentPoint.temperature.toFixed(1)}°C` : '-'}`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tuyến và chất lượng dữ liệu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <StatTile
                      label="Điểm đầu"
                      value={firstPoint ? formatCoordinateLabel(firstPoint.latitude, firstPoint.longitude, 6) : '-'}
                      helper={firstPoint ? formatDateTime(firstPoint.timestamp, 'dd/MM HH:mm') : undefined}
                    />
                    <StatTile
                      label="Điểm cuối"
                      value={lastPoint ? formatCoordinateLabel(lastPoint.latitude, lastPoint.longitude, 6) : '-'}
                      helper={lastPoint ? formatDateTime(lastPoint.timestamp, 'dd/MM HH:mm') : undefined}
                    />
                  </div>
                  <div className="rounded-xl border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                    Chu kỳ cấu hình đang được lưu thật ở backend dưới dạng `requestInterval`. Khi đổi ở
                    tab Cài đặt, modal sẽ đồng thời phát command `update_config`; còn `Nhịp quan sát`
                    và `Độ tươi` ở đây dùng để kiểm tra thiết bị có thực sự gửi đúng nhịp hay không.
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Các mốc GPS mới nhất</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {waypointPreview.length > 0 ? (
                    waypointPreview.map((point) => (
                      <div key={`${point.timestamp}-${point.timestampMs}`} className="rounded-xl border bg-muted/20 px-3 py-2.5 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{formatDateTime(point.timestamp, 'dd/MM HH:mm:ss')}</p>
                          <span className="text-xs text-muted-foreground">{point.speed !== null ? `${point.speed.toFixed(1)} km/h` : '-'}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatCoordinateLabel(point.latitude, point.longitude, 6)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed px-3 py-5 text-center text-sm text-muted-foreground">
                      Chưa có waypoint gần đây để hiển thị.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
