'use client';

import { useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { Progress } from '@/components/ui/progress';
import { formatDateTime, formatDuration, formatRelative } from '@/lib/utils/date/format';
import { ResponsiveContainer, Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { useMap } from 'react-leaflet';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((m) => m.CircleMarker), {
  ssr: false,
});

const toTimestamp = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const InfoRow = ({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) => (
  <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-medium">{value}</p>
    {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
  </div>
);

const TripViewportSync = ({
  pathPoints,
  movingPoint,
}: {
  pathPoints: [number, number][];
  movingPoint: [number, number] | null;
}) => {
  const map = useMap();
  const fittedRef = useRef(false);
  const boundsKey = useMemo(
    () => pathPoints.map(([lat, lon]) => `${lat.toFixed(5)},${lon.toFixed(5)}`).join('|'),
    [pathPoints],
  );

  useEffect(() => {
    if (pathPoints.length === 0) {
      fittedRef.current = false;
      return;
    }

    if (!fittedRef.current) {
      if (pathPoints.length === 1) {
        map.setView(pathPoints[0], Math.max(map.getZoom(), 14), { animate: true });
      } else {
        map.fitBounds(pathPoints, {
          padding: [28, 28],
          maxZoom: 14,
        });
      }
      fittedRef.current = true;
    }
  }, [boundsKey, map, pathPoints]);

  useEffect(() => {
    if (!movingPoint) {
      return;
    }

    map.panTo(movingPoint, { animate: true, duration: 0.45 });
  }, [map, movingPoint]);

  return null;
};

export const TripDetail = ({
  trip,
  summary: _summary,
  points,
  moving,
  cursor,
}: {
  trip?: any;
  summary?: any;
  points: any[];
  moving?: any;
  cursor: number;
}) => {
  const pathPoints = points
    .filter((point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lon))
    .map((point) => [Number(point.lat), Number(point.lon)] as [number, number]);
  const startPoint = points[0] ?? null;
  const endPoint = points.at(-1) ?? null;
  const hasStartCoordinates =
    Number.isFinite(Number(startPoint?.lat)) && Number.isFinite(Number(startPoint?.lon));
  const hasEndCoordinates =
    Number.isFinite(Number(endPoint?.lat)) && Number.isFinite(Number(endPoint?.lon));
  const hasMovingCoordinates =
    Number.isFinite(Number(moving?.lat)) && Number.isFinite(Number(moving?.lon));
  const movingPoint = hasMovingCoordinates
    ? ([Number(moving.lat), Number(moving.lon)] as [number, number])
    : null;
  const peakPoint =
    points.reduce<any | null>(
      (candidate, point) =>
        Number(point?.speed ?? 0) > Number(candidate?.speed ?? -1) ? point : candidate,
      null,
    ) ?? null;
  const firstTimestamp = toTimestamp(startPoint?.timestamp ?? trip?.actualStart ?? trip?.plannedStart);
  const lastTimestamp = toTimestamp(endPoint?.timestamp ?? trip?.actualEnd ?? trip?.plannedEnd);
  const coverageSeconds =
    firstTimestamp !== null && lastTimestamp !== null && lastTimestamp > firstTimestamp
      ? Math.round((lastTimestamp - firstTimestamp) / 1000)
      : 0;
  const averageGapSeconds =
    points.length > 1 && coverageSeconds > 0 ? Math.round(coverageSeconds / (points.length - 1)) : 0;
  const replayProgress =
    points.length > 1 ? Math.round((Math.min(cursor, points.length - 1) / (points.length - 1)) * 100) : 0;
  const telemetryBadge =
    points.length === 0
      ? { label: 'Chưa có telemetry', variant: 'secondary' as const }
      : averageGapSeconds <= 30
        ? { label: 'Telemetry dày', variant: 'default' as const }
        : averageGapSeconds <= 120
          ? { label: 'Telemetry ổn định', variant: 'outline' as const }
          : { label: 'Telemetry thưa', variant: 'destructive' as const };

  const timeline = [
    {
      label: 'Khởi hành dự kiến',
      time: trip?.plannedStart,
      description: trip?.startLocation ?? 'Chưa cấu hình điểm đi',
    },
    {
      label: 'Khởi hành thực tế',
      time: trip?.actualStart ?? startPoint?.timestamp,
      description: startPoint ? `${startPoint.lat}, ${startPoint.lon}` : 'Chưa ghi nhận GPS đầu hành trình',
    },
    {
      label: 'Đỉnh tốc độ',
      time: peakPoint?.timestamp,
      description: peakPoint ? `${peakPoint.speed ?? 0} km/h` : 'Chưa có dữ liệu tốc độ',
    },
    {
      label: 'Điểm replay hiện tại',
      time: moving?.timestamp,
      description:
        moving && points.length > 0
          ? `Mốc ${Math.min(cursor + 1, points.length)}/${points.length} • ${moving.speed ?? 0} km/h`
          : 'Chưa bắt đầu replay',
    },
    {
      label: 'Kết thúc',
      time: trip?.actualEnd ?? endPoint?.timestamp ?? trip?.plannedEnd,
      description: trip?.endLocation ?? 'Chưa chốt điểm đến',
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Lộ trình chuyến đi</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {points.length > 0
                    ? `${points.length} mốc GPS • cập nhật cuối ${formatRelative(endPoint?.timestamp ?? trip?.updatedAt)}`
                    : 'Chưa có đủ dữ liệu GPS để dựng tuyến đường.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={telemetryBadge.variant}>{telemetryBadge.label}</Badge>
                <Badge variant="outline">
                  {averageGapSeconds > 0 ? `${averageGapSeconds}s / mốc` : 'Chưa có nhịp ghi'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[360px] p-0 sm:h-[440px] xl:h-[500px]">
            {pathPoints.length === 0 ? (
              <div className="flex h-full items-center justify-center p-6">
                <EmptyState
                  title="Chưa có dữ liệu hành trình"
                  description="Chuyến đi này chưa ghi nhận đủ điểm GPS để hiển thị bản đồ."
                />
              </div>
            ) : (
              <MapContainer
                center={movingPoint ?? pathPoints[0] ?? [10.762622, 106.660172]}
                zoom={12}
                className="h-full w-full"
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <TripViewportSync pathPoints={pathPoints} movingPoint={movingPoint} />
                {pathPoints.length > 1 ? (
                  <Polyline positions={pathPoints} pathOptions={{ color: '#0ea5e9', weight: 5 }} />
                ) : null}
                {hasStartCoordinates ? (
                  <CircleMarker
                    center={[Number(startPoint.lat), Number(startPoint.lon)]}
                    radius={7}
                    pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.85 }}
                  />
                ) : null}
                {hasEndCoordinates ? (
                  <CircleMarker
                    center={[Number(endPoint.lat), Number(endPoint.lon)]}
                    radius={7}
                    pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.85 }}
                  />
                ) : null}
                {hasMovingCoordinates ? (
                  <CircleMarker
                    center={[Number(moving.lat), Number(moving.lon)]}
                    radius={9}
                    pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.95 }}
                  />
                ) : null}
              </MapContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <CardTitle>Tóm tắt tuyến và chất lượng telemetry</CardTitle>
              <Badge variant="outline">
                {coverageSeconds > 0 ? formatDuration(coverageSeconds) : 'Chưa có phủ sóng thời gian'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <InfoRow
              label="Điểm đi"
              value={trip?.startLocation ?? 'Chưa cấu hình'}
              description={formatDateTime(trip?.actualStart ?? startPoint?.timestamp)}
            />
            <InfoRow
              label="Điểm đến"
              value={trip?.endLocation ?? 'Chưa cấu hình'}
              description={formatDateTime(trip?.actualEnd ?? endPoint?.timestamp)}
            />
            <InfoRow
              label="Phủ sóng telemetry"
              value={points.length ? `${points.length} waypoint` : 'Chưa có waypoint'}
            />
            <InfoRow
              label="Khoảng cách giữa các mốc"
              value={averageGapSeconds > 0 ? `${averageGapSeconds} giây` : 'Chưa đủ dữ liệu'}
            />
            <InfoRow
              label="Đỉnh tốc độ"
              value={peakPoint ? `${peakPoint.speed ?? 0} km/h` : 'Chưa có'}
              description={peakPoint?.timestamp ? formatDateTime(peakPoint.timestamp) : undefined}
            />
            <InfoRow
              label="Nhiên liệu tiêu thụ"
              value={
                trip?.fuelUsedLiters !== null && trip?.fuelUsedLiters !== undefined
                  ? `${trip.fuelUsedLiters} lít`
                  : 'Chưa có dữ liệu'
              }
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Tốc độ theo thời gian</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {points.length === 0 ? (
              <EmptyState
                title="Chưa có dữ liệu tốc độ"
                description="Biểu đồ tốc độ sẽ xuất hiện khi chuyến đi ghi nhận waypoint từ telemetry."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={points.map((point: any) => ({
                    time: formatDateTime(point.timestamp, 'HH:mm'),
                    speed: Number(point.speed ?? 0),
                  }))}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} width={36} />
                  <Tooltip formatter={(value) => [`${value} km/h`, 'Tốc độ']} />
                  <Area
                    type="monotone"
                    dataKey="speed"
                    stroke="#f97316"
                    fill="#fdba74"
                    fillOpacity={0.35}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Điểm hiện tại trong replay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tiến độ replay</span>
                <span className="font-medium">
                  {points.length > 0 ? `${Math.min(cursor + 1, points.length)}/${points.length}` : '0/0'}
                </span>
              </div>
              <Progress value={replayProgress} />
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <InfoRow label="Thời điểm" value={formatDateTime(moving?.timestamp)} />
              <InfoRow label="Tốc độ" value={`${moving?.speed ?? 0} km/h`} />
              <InfoRow
                label="Vĩ độ"
                value={moving?.lat !== null && moving?.lat !== undefined ? String(moving.lat) : 'Chưa có'}
              />
              <InfoRow
                label="Kinh độ"
                value={moving?.lon !== null && moving?.lon !== undefined ? String(moving.lon) : 'Chưa có'}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dòng thời gian chuyến đi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {timeline.map((item) => (
              <div key={item.label} className="rounded-xl border bg-muted/20 px-4 py-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(item.time)}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
