'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((m) => m.CircleMarker), {
  ssr: false,
});

const hasValidCoordinates = (value: any) =>
  Number.isFinite(value?.lat) &&
  Number.isFinite(value?.lon) &&
  Math.abs(value.lat) <= 90 &&
  Math.abs(value.lon) <= 180;

const formatPointTime = (value: unknown) => {
  if (!value) return '--';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('vi-VN');
};

export const TripDetail = ({ points, moving }: { points: any[]; moving?: any }) => {
  const validPoints = useMemo(() => points.filter((point) => hasValidCoordinates(point)), [points]);
  const polyline = useMemo(
    () => validPoints.map((point: any) => [point.lat, point.lon] as [number, number]),
    [validPoints],
  );

  const startPoint = validPoints[0] ?? null;
  const endPoint = validPoints[validPoints.length - 1] ?? null;
  const movingPoint = hasValidCoordinates(moving) ? moving : endPoint;

  const sampledPoints = useMemo(() => {
    if (validPoints.length <= 8) return validPoints;
    const step = Math.max(1, Math.floor(validPoints.length / 8));
    return validPoints.filter((_: any, index: number) => index % step === 0).slice(0, 8);
  }, [validPoints]);

  const speedSeries = useMemo(
    () =>
      validPoints.map((point: any) => ({
        time: new Date(point.timestamp).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        speed: point.speed,
      })),
    [validPoints],
  );

  const stopCount = useMemo(
    () => validPoints.filter((point: any) => Number(point.speed ?? 0) <= 3).length,
    [validPoints],
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
      <Card>
        <CardHeader>
          <CardTitle>Lộ trình</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[320px] p-0 sm:min-h-[420px]">
          {polyline.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                title="Chưa có dữ liệu hành trình"
                description="Chuyến đi này chưa ghi nhận đủ điểm GPS để hiển thị bản đồ."
              />
            </div>
          ) : (
            <MapContainer
              center={movingPoint ? [movingPoint.lat, movingPoint.lon] : polyline[0] ?? [10.762622, 106.660172]}
              zoom={12}
              bounds={polyline.length > 1 ? (polyline as any) : undefined}
              boundsOptions={{ padding: [24, 24] }}
              className="h-full w-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {polyline.length > 1 ? (
                <Polyline positions={polyline} pathOptions={{ color: '#0ea5e9', weight: 5 }} />
              ) : null}
              {startPoint ? (
                <CircleMarker
                  center={[startPoint.lat, startPoint.lon]}
                  radius={7}
                  pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.9 }}
                />
              ) : null}
              {endPoint ? (
                <CircleMarker
                  center={[endPoint.lat, endPoint.lon]}
                  radius={7}
                  pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.9 }}
                />
              ) : null}
              {movingPoint ? <Marker position={[movingPoint.lat, movingPoint.lon]} /> : null}
            </MapContainer>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Tốc độ theo thời gian</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            {speedSeries.length === 0 ? (
              <EmptyState
                title="Chưa có dữ liệu tốc độ"
                description="Bản ghi telemetry sẽ xuất hiện ở đây khi chuyến đi có dữ liệu GPS."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={speedSeries}>
                  <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} width={36} />
                  <Tooltip />
                  <Area type="monotone" dataKey="speed" stroke="#f97316" fill="#fed7aa" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tóm tắt hành trình</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">Số điểm GPS</p>
              <p className="font-semibold">{validPoints.length}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">Điểm dừng (≤ 3 km/h)</p>
              <p className="font-semibold">{stopCount}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2 sm:col-span-2">
              <p className="text-xs text-muted-foreground">Mốc bắt đầu</p>
              <p className="font-semibold">{formatPointTime(startPoint?.timestamp)}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2 sm:col-span-2">
              <p className="text-xs text-muted-foreground">Mốc kết thúc</p>
              <p className="font-semibold">{formatPointTime(endPoint?.timestamp)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Mốc telemetry chính</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sampledPoints.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có điểm telemetry để hiển thị.</p>
            ) : (
              sampledPoints.map((point: any, index: number) => (
                <div
                  key={`${point.timestamp ?? index}-${index}`}
                  className="rounded-xl border bg-muted/20 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{formatPointTime(point.timestamp)}</p>
                    <Badge variant="secondary">{Number(point.speed ?? 0)} km/h</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {Number(point.lat).toFixed(5)}, {Number(point.lon).toFixed(5)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
