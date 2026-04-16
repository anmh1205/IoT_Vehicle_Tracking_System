'use client';

import dynamic from 'next/dynamic';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { hasValidMapCoordinates } from '@/features/map/constants/map-config';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Nghiêm trọng',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
  acknowledged: 'Đã xác nhận',
  resolved: 'Đã giải quyết',
  dismissed: 'Đã bỏ qua',
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  speeding: 'Vượt tốc độ',
  geofence: 'Ra/vào vùng giám sát',
  geofence_enter: 'Vào vùng giám sát',
  geofence_exit: 'Rời vùng giám sát',
  offline: 'Mất kết nối',
  maintenance: 'Bảo trì',
  maintenance_due: 'Khuyến nghị bảo trì',
  other: 'Khác',
  harsh_braking: 'Phanh gấp',
  idle_too_long: 'Dừng quá lâu',
};

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-medium">{value}</p>
  </div>
);

export const AlertDetailModal = ({
  open,
  onOpenChange,
  alert,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  alert: any | null;
}) => {
  const coordinates = {
    lat: Number(alert?.latitude),
    lon: Number(alert?.longitude),
  };
  const hasCoordinates = hasValidMapCoordinates(coordinates);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant={alert?.severity === 'critical' ? 'destructive' : 'secondary'}>
              {SEVERITY_LABELS[alert?.severity] ?? alert?.severity ?? 'Chưa xác định'}
            </Badge>
            <Badge variant={alert?.status === 'active' ? 'default' : 'outline'}>
              {STATUS_LABELS[alert?.status] ?? alert?.status ?? 'Chưa xác định'}
            </Badge>
            <Badge variant="outline">
              {ALERT_TYPE_LABELS[alert?.alertType] ?? alert?.alertType ?? 'Chưa xác định'}
            </Badge>
          </div>
          <div className="space-y-1">
            <DialogTitle>{alert?.title ?? 'Chi tiết cảnh báo'}</DialogTitle>
            <DialogDescription>
              {alert?.message ?? 'Cảnh báo này chưa có mô tả chi tiết từ hệ thống phát sinh.'}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <Card className="border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
              <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
                <InfoRow label="Phát sinh" value={formatDateTime(alert?.createdAt)} />
                <InfoRow
                  label="Cập nhật gần nhất"
                  value={
                    alert?.updatedAt
                      ? `${formatDateTime(alert.updatedAt)} (${formatRelative(alert.updatedAt)})`
                      : 'Chưa có dữ liệu'
                  }
                />
                <InfoRow label="Giá trị thực tế" value={alert?.actualValue !== null && alert?.actualValue !== undefined ? String(alert.actualValue) : 'Chưa có'} />
                <InfoRow label="Ngưỡng cảnh báo" value={alert?.thresholdValue !== null && alert?.thresholdValue !== undefined ? String(alert.thresholdValue) : 'Chưa có'} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ngữ cảnh cảnh báo</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Phương tiện" value={alert?.vehicleId ?? 'Chưa liên kết'} />
                <InfoRow label="Thiết bị" value={alert?.deviceId ?? 'Chưa liên kết'} />
                <InfoRow label="Chuyến đi" value={alert?.tripId ? String(alert.tripId) : 'Không gắn chuyến đi'} />
                <InfoRow label="Geofence" value={alert?.geofenceId ? String(alert.geofenceId) : 'Không gắn geofence'} />
                <InfoRow label="Tốc độ lúc cảnh báo" value={alert?.speed !== null && alert?.speed !== undefined ? `${alert.speed} km/h` : 'Chưa có'} />
                <InfoRow label="Loại cảnh báo" value={ALERT_TYPE_LABELS[alert?.alertType] ?? alert?.alertType ?? 'Khác'} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dòng thời gian xử lý</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border bg-muted/20 px-4 py-3">
                  <p className="text-sm font-semibold">Tạo cảnh báo</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(alert?.createdAt)}</p>
                </div>
                <div className="rounded-xl border bg-muted/20 px-4 py-3">
                  <p className="text-sm font-semibold">Xác nhận</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {alert?.acknowledgedAt
                      ? `${formatDateTime(alert.acknowledgedAt)} • User ${alert.acknowledgedBy ?? '-'}`
                      : 'Chưa có thao tác xác nhận'}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/20 px-4 py-3">
                  <p className="text-sm font-semibold">Giải quyết</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {alert?.resolvedAt
                      ? `${formatDateTime(alert.resolvedAt)} • User ${alert.resolvedBy ?? '-'}`
                      : 'Chưa đóng cảnh báo'}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {alert?.resolutionNotes ?? 'Chưa có ghi chú xử lý.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vị trí phát sinh</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Tọa độ</p>
                <p className="mt-1 font-medium">
                  {hasCoordinates
                    ? `${coordinates.lat.toFixed(5)}, ${coordinates.lon.toFixed(5)}`
                    : 'Cảnh báo này không có tọa độ hợp lệ để hiển thị'}
                </p>
              </div>

              <div className="h-[320px] overflow-hidden rounded-xl border">
                {hasCoordinates ? (
                  <MapContainer center={[coordinates.lat, coordinates.lon]} zoom={14} className="h-full w-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[coordinates.lat, coordinates.lon]} />
                  </MapContainer>
                ) : (
                  <div className="flex h-full items-center justify-center p-6">
                    <EmptyState
                      title="Không có tọa độ hợp lệ"
                      description="Hệ thống chỉ hiển thị bản đồ khi cảnh báo có latitude/longitude hợp lệ."
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
