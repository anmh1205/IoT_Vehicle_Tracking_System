'use client';

import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DEFAULT_MAP_VIEWPORT, MAP_LAYER_CONFIG } from '@/features/map/constants/map-config';
import { formatDateTime, formatNumber, formatRelative } from '@/lib/utils/date/format';
import { useDeviceDetailModal } from './modal-context';

const MapContainer = dynamic(() => import('react-leaflet').then((module) => module.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((module) => module.TileLayer), {
  ssr: false,
});
const Polyline = dynamic(() => import('react-leaflet').then((module) => module.Polyline), {
  ssr: false,
});
const CircleMarker = dynamic(() => import('react-leaflet').then((module) => module.CircleMarker), {
  ssr: false,
});

const PERIOD_OPTIONS = [
  { label: '6 giờ', value: '6h' },
  { label: '24 giờ', value: '24h' },
  { label: '7 ngày', value: '7d' },
] as const;

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
  } = useDeviceDetailModal();

  const fallbackPoint =
    positionSnapshot?.latitude !== null &&
    positionSnapshot?.latitude !== undefined &&
    positionSnapshot?.longitude !== null &&
    positionSnapshot?.longitude !== undefined
      ? ([positionSnapshot.latitude, positionSnapshot.longitude] as [number, number])
      : null;

  const mapPoints = routePoints.length > 0 ? routePoints : fallbackPoint ? [fallbackPoint] : [];
  const mapCenter = mapPoints[0] ?? DEFAULT_MAP_VIEWPORT.center;
  const startPoint = mapPoints[0] ?? null;
  const endPoint = mapPoints.at(-1) ?? null;
  const hasLatestCoordinates =
    latestTrackingRow !== null &&
    latestTrackingRow.latitude !== null &&
    latestTrackingRow.longitude !== null;
  const hasFallbackCoordinates =
    positionSnapshot !== null &&
    positionSnapshot.latitude !== null &&
    positionSnapshot.longitude !== null;
  const coordinatesLabel =
    hasLatestCoordinates && latestTrackingRow
      ? `${latestTrackingRow.latitude!.toFixed(6)}, ${latestTrackingRow.longitude!.toFixed(6)}`
      : hasFallbackCoordinates && positionSnapshot
        ? `${positionSnapshot.latitude!.toFixed(6)}, ${positionSnapshot.longitude!.toFixed(6)}`
        : '-';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Lộ trình di chuyển</CardTitle>
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
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Quãng đường ước tính</p>
              <p className="mt-1 text-lg font-semibold">{distanceKm.toFixed(2)} km</p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Tốc độ trung bình</p>
              <p className="mt-1 text-lg font-semibold">{averageSpeed.toFixed(1)} km/h</p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Tốc độ tối đa</p>
              <p className="mt-1 text-lg font-semibold">{maxSpeed.toFixed(1)} km/h</p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Điểm GPS hợp lệ</p>
              <p className="mt-1 text-lg font-semibold">{formatNumber(routePoints.length)}</p>
            </div>
          </div>

          <div className="h-[340px] overflow-hidden rounded-xl border bg-muted/10">
            {mapPoints.length === 0 ? (
              <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
                Chưa có dữ liệu tọa độ hợp lệ để hiển thị bản đồ.
              </div>
            ) : (
              <MapContainer center={mapCenter} zoom={13} className="h-full w-full">
                <TileLayer
                  url={MAP_LAYER_CONFIG.street.url}
                  attribution={MAP_LAYER_CONFIG.street.attribution}
                />
                {mapPoints.length > 1 ? (
                  <Polyline positions={mapPoints} pathOptions={{ color: '#0ea5e9', weight: 5 }} />
                ) : null}
                {startPoint ? (
                  <CircleMarker
                    center={startPoint}
                    radius={6}
                    pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.85 }}
                  />
                ) : null}
                {endPoint ? (
                  <CircleMarker
                    center={endPoint}
                    radius={7}
                    pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.9 }}
                  />
                ) : null}
              </MapContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Snapshot tracking mới nhất</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Cập nhật</p>
              <p className="font-medium">
                {latestTrackingRow?.timestamp
                  ? `${formatDateTime(latestTrackingRow.timestamp)} (${formatRelative(latestTrackingRow.timestamp)})`
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tọa độ</p>
              <p className="font-medium">{coordinatesLabel}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tốc độ</p>
              <p className="font-medium">{latestTrackingRow?.speed?.toFixed(1) ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pin / nhiệt độ</p>
              <p className="font-medium">
                {latestTrackingRow?.battery?.toFixed(1) ?? '-'}% ·{' '}
                {latestTrackingRow?.temperature?.toFixed(1) ?? '-'}°C
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tình trạng nguồn dữ liệu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={trackingRowsAscending.length > 0 ? 'default' : 'secondary'}>
                {trackingRowsAscending.length > 0 ? 'Có telemetry' : 'Chưa có telemetry'}
              </Badge>
              <Badge variant={positionSnapshot ? 'outline' : 'secondary'}>
                {positionSnapshot ? 'Có vị trí realtime' : 'Chưa có vị trí realtime'}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Dữ liệu đang lấy theo khung thời gian{' '}
              {PERIOD_OPTIONS.find((item) => item.value === trackingPeriod)?.label.toLowerCase()}.
            </p>
            <p className="text-muted-foreground">
              Tổng bản ghi telemetry gộp: {formatNumber(trackingRowsAscending.length)}.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
