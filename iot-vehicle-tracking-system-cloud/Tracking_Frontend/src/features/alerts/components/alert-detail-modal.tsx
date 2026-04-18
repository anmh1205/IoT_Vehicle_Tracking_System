'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useMap } from 'react-leaflet';
import { EmptyState } from '@/components/common/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { hasValidMapCoordinates, MAP_LAYER_CONFIG } from '@/features/map/constants/map-config';
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
  device_offline: 'Mất kết nối thiết bị',
  maintenance: 'Bảo trì',
  maintenance_due: 'Khuyến nghị bảo trì',
  harsh_braking: 'Phanh gấp',
  idle_too_long: 'Dừng quá lâu',
  other: 'Khác',
};

const buildAlertExplanation = (alert: any) => {
  switch (alert?.alertType) {
    case 'speeding':
      return {
        summary: 'Phương tiện đã vượt quá ngưỡng tốc độ được cấu hình.',
        action:
          'Đối chiếu tuyến chạy, tài xế và chính sách tốc độ để quyết định xác nhận hay xử lý tiếp.',
      };
    case 'geofence_enter':
      return {
        summary: 'Phương tiện vừa đi vào vùng giám sát đã khai báo.',
        action:
          'Kiểm tra đây có phải điểm đến hợp lệ hoặc mốc vận hành mong đợi hay không.',
      };
    case 'geofence_exit':
      return {
        summary: 'Phương tiện vừa rời vùng giám sát hoặc bán kính hoạt động cho phép.',
        action:
          'Kiểm tra lý do rời vùng, người điều phối liên quan và các chính sách áp dụng.',
      };
    case 'device_offline':
    case 'offline':
      return {
        summary: 'Thiết bị không gửi bản tin hoặc mất kết nối trong một khoảng thời gian.',
        action:
          'Kiểm tra nguồn cấp, tín hiệu SIM, modem và trạng thái wake/sleep của thiết bị.',
      };
    case 'maintenance_due':
      return {
        summary: 'Dữ liệu vận hành cho thấy xe đang tới ngưỡng bảo trì hoặc cần kiểm tra.',
        action:
          'Tạo hoặc cập nhật phiếu bảo trì, xác nhận lịch hẹn và theo dõi tiến độ xử lý.',
      };
    case 'harsh_braking':
      return {
        summary: 'Hệ thống phát hiện sự kiện phanh gấp vượt ngưỡng an toàn.',
        action:
          'Đối chiếu hành trình, vị trí và tần suất để đánh giá hành vi lái xe.',
      };
    default:
      return {
        summary: 'Cảnh báo này cần được đối chiếu thêm với dữ liệu thiết bị và lịch sử vận hành.',
        action:
          'Mở bản đồ, telemetry và lịch sử cảnh báo để xác định nguyên nhân gốc.',
      };
  }
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1 rounded-xl border bg-muted/20 px-3 py-2.5">
    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="text-sm font-medium">{value}</p>
  </div>
);

const AlertDetailMapSync = ({
  lat,
  lon,
  open,
}: {
  lat: number;
  lon: number;
  open: boolean;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const syncMap = () => {
      map.invalidateSize({ pan: false, debounceMoveend: true });
      map.setView([lat, lon], 14, { animate: false });
    };

    const frame = window.requestAnimationFrame(syncMap);
    const timeoutId = window.setTimeout(syncMap, 240);
    const lateTimeoutId = window.setTimeout(syncMap, 900);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeoutId);
      window.clearTimeout(lateTimeoutId);
    };
  }, [lat, lon, map, open]);

  return null;
};

export const AlertDetailModal = ({
  open,
  onOpenChange,
  alert,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  alert: any | null;
}) => {
  const coordinates = {
    lat: Number(alert?.latitude),
    lon: Number(alert?.longitude),
  };
  const hasCoordinates = hasValidMapCoordinates(coordinates);
  const explanation = buildAlertExplanation(alert);
  const displayTitle = alert?.displayTitle ?? alert?.title ?? 'Chi tiết cảnh báo';
  const displayMessage =
    alert?.displayMessage ??
    alert?.message ??
    'Cảnh báo này chưa có mô tả chi tiết từ hệ thống phát sinh.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl">
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
            <DialogTitle>{displayTitle}</DialogTitle>
            <DialogDescription>{displayMessage}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
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
                <InfoRow
                  label="Giá trị thực tế"
                  value={
                    alert?.actualValue !== null && alert?.actualValue !== undefined
                      ? String(alert.actualValue)
                      : 'Chưa có'
                  }
                />
                <InfoRow
                  label="Ngưỡng cảnh báo"
                  value={
                    alert?.thresholdValue !== null && alert?.thresholdValue !== undefined
                      ? String(alert.thresholdValue)
                      : 'Chưa có'
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ngữ cảnh cảnh báo</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <InfoRow
                  label="Phương tiện"
                  value={alert?.vehiclePlate ?? alert?.vehicleId ?? 'Chưa liên kết'}
                />
                <InfoRow
                  label="Thiết bị"
                  value={alert?.deviceName ?? alert?.deviceId ?? 'Chưa liên kết'}
                />
                <InfoRow
                  label="Khách hàng"
                  value={alert?.customerName ?? 'Chưa có ngữ cảnh khách hàng'}
                />
                <InfoRow
                  label="Chuyến đi"
                  value={alert?.tripId ? String(alert.tripId) : 'Không gắn chuyến đi'}
                />
                <InfoRow
                  label="Geofence"
                  value={alert?.geofenceId ? String(alert.geofenceId) : 'Không gắn geofence'}
                />
                <InfoRow
                  label="Tốc độ lúc cảnh báo"
                  value={
                    alert?.speed !== null && alert?.speed !== undefined
                      ? `${alert.speed} km/h`
                      : 'Chưa có'
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Diễn giải và hướng xử lý</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Diễn giải" value={explanation.summary} />
                <InfoRow label="Đề xuất xử lý" value={explanation.action} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dòng thời gian xử lý</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border bg-muted/20 px-4 py-3">
                  <p className="text-sm font-semibold">Tạo cảnh báo</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateTime(alert?.createdAt)}
                  </p>
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

              <div className="h-[360px] overflow-hidden rounded-xl border">
                {hasCoordinates ? (
                  <MapContainer
                    key={alert?.id ?? `${coordinates.lat}-${coordinates.lon}`}
                    center={[coordinates.lat, coordinates.lon]}
                    zoom={14}
                    className="h-full w-full"
                  >
                    <AlertDetailMapSync lat={coordinates.lat} lon={coordinates.lon} open={open} />
                    <TileLayer
                      attribution={MAP_LAYER_CONFIG.street.attribution}
                      url={MAP_LAYER_CONFIG.street.url}
                    />
                    <Marker position={[coordinates.lat, coordinates.lon]} />
                  </MapContainer>
                ) : (
                  <div className="flex h-full items-center justify-center p-6">
                    <EmptyState
                      title="Không có tọa độ hợp lệ"
                      description="Bản đồ chỉ hiển thị khi cảnh báo có latitude và longitude hợp lệ."
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
