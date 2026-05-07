'use client';

import { useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useMap } from 'react-leaflet';
import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createDeviceMarkerIcon } from '@/features/map/components/marker-icon';
import { hasValidMapCoordinates, MAP_LAYER_CONFIG } from '@/features/map/constants/map-config';
import {
  getAlertSeverityLabel,
  getAlertStatusLabel,
  getAlertTypeLabel,
} from '@/lib/api/alerts';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });

const stripAlertMarkup = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[`*_>#~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized || fallback;
};

const formatMetricValue = (value: unknown, fallback = 'Chưa có') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return String(value);
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildAlertExplanation = (alert: any, displayMessage: string) => {
  const actualValue = toNumber(alert?.actualValue ?? alert?.rawValue ?? alert?.speed);
  const thresholdValue = toNumber(alert?.thresholdValue);
  const overThreshold =
    actualValue !== null && thresholdValue !== null ? actualValue - thresholdValue : null;
  const geofenceName =
    alert?.geofenceName ?? (alert?.geofenceId ? `#${alert.geofenceId}` : 'Chưa xác định');
  const sourceRef = alert?.deviceName ?? alert?.deviceId ?? 'thiết bị chưa xác định';
  const vehicleRef = alert?.vehiclePlate ?? alert?.vehicleId ?? 'xe chưa xác định';

  switch (alert?.alertType) {
    case 'speeding':
      return {
        summary: `Xe ${vehicleRef} vượt ngưỡng tốc độ trong phiên theo dõi.`,
        trigger:
          overThreshold !== null
            ? `Tốc độ ${actualValue?.toFixed(1)} km/h, cao hơn ${overThreshold.toFixed(1)} km/h so với ngưỡng ${thresholdValue?.toFixed(1)} km/h.`
            : displayMessage,
        actions: [
          'Kiểm tra đoạn đường và giới hạn tốc độ tại thời điểm phát sinh.',
          'Liên hệ tài xế để xác nhận tình huống và nguyên nhân.',
          'Nếu tái diễn trong cùng ca, tạo biên bản vi phạm để theo dõi.',
        ],
      };
    case 'zone_enter':
    case 'geofence':
    case 'geofence_enter':
      return {
        summary: `Xe ${vehicleRef} đi vào vùng ${geofenceName}.`,
        trigger: `Nguồn cảnh báo: ${sourceRef}. ${displayMessage}`,
        actions: [
          'Đối chiếu lệnh điều phối để xác nhận điểm đến có hợp lệ.',
          'Nếu không hợp lệ, liên hệ điều phối viên để xử lý ngay.',
          'Cập nhật ghi chú xác minh trước khi đóng cảnh báo.',
        ],
      };
    case 'zone_exit':
    case 'geofence_exit':
      return {
        summary: `Xe ${vehicleRef} rời khỏi vùng ${geofenceName}.`,
        trigger: `Nguồn cảnh báo: ${sourceRef}. ${displayMessage}`,
        actions: [
          'Kiểm tra tuyến thực tế và mục đích rời vùng đã đăng ký.',
          'Liên hệ tài xế hoặc đơn vị liên quan để xác nhận thay đổi lộ trình.',
          'Ghi lại nguyên nhân rời vùng để phục vụ truy vết sau này.',
        ],
      };
    case 'zone_outside_periodic':
      return {
        summary: `Xe ${vehicleRef} vẫn đang ở ngoài vùng ${geofenceName}.`,
        trigger: `Nguồn cảnh báo: ${sourceRef}. ${displayMessage}`,
        actions: [
          'Kiểm tra lý do xe tiếp tục ở ngoài vùng trong khoảng thời gian kéo dài.',
          'Xác nhận với điều phối hoặc tài xế xem đây có phải thay đổi hợp lệ hay không.',
          'Nếu không hợp lệ, escalates ngay để xử lý theo quy trình vận hành.',
        ],
      };
    case 'device_offline':
    case 'offline':
      return {
        summary: `Thiết bị ${sourceRef} trên ${vehicleRef} bị gián đoạn kết nối.`,
        trigger: `Thời lượng im lặng: ${formatMetricValue(alert?.actualValue, 'Chưa xác định')} • Ngưỡng cảnh báo: ${formatMetricValue(alert?.thresholdValue, 'Chưa cấu hình')}.`,
        actions: [
          'Kiểm tra nguồn điện thiết bị, SIM/data và vùng phủ sóng.',
          'Xác định bản tin cuối cùng để khoanh vùng thời điểm mất kết nối.',
          'Nếu kéo dài, lập yêu cầu kiểm tra thiết bị tại hiện trường.',
        ],
      };
    case 'maintenance':
    case 'maintenance_due':
      return {
        summary: `Xe ${vehicleRef} đã tới ngưỡng cần bảo trì.`,
        trigger:
          actualValue !== null && thresholdValue !== null
            ? `Chỉ số hiện tại ${actualValue.toFixed(1)} so với ngưỡng ${thresholdValue.toFixed(1)}.`
            : displayMessage,
        actions: [
          'Tạo phiếu bảo trì theo đúng hạng mục cảnh báo.',
          'Chốt lịch xử lý và người phụ trách trước ca vận hành kế tiếp.',
          'Xác nhận hoàn tất bảo trì rồi mới đóng cảnh báo.',
        ],
      };
    case 'harsh_braking':
      return {
        summary: `Xe ${vehicleRef} phát sinh sự kiện phanh gấp.`,
        trigger: `Thông điệp từ ${sourceRef}: ${displayMessage}`,
        actions: [
          'Đối chiếu tốc độ ngay trước thời điểm phanh và điều kiện giao thông.',
          'Kiểm tra tần suất phanh gấp trong cùng ngày để đánh giá rủi ro.',
          'Nếu lặp lại nhiều, lên lịch nhắc nhở hoặc đào tạo lái xe an toàn.',
        ],
      };
    case 'idle_too_long':
      return {
        summary: `Xe ${vehicleRef} dừng/đỗ vượt thời gian cho phép.`,
        trigger:
          actualValue !== null && thresholdValue !== null
            ? `Thời gian dừng ${actualValue.toFixed(1)} phút, ngưỡng ${thresholdValue.toFixed(1)} phút.`
            : displayMessage,
        actions: [
          'Xác minh lý do dừng lâu với tài xế hoặc điều phối.',
          'Kiểm tra mức tiêu hao nhiên liệu và điều kiện an toàn tại điểm dừng.',
          'Điều chỉnh tuyến hoặc thời lượng nghỉ nếu dừng lâu lặp lại.',
        ],
      };
    default:
      return {
        summary: `Cảnh báo ${alert?.alertType ?? 'không xác định'} phát sinh từ ${sourceRef}.`,
        trigger: `Xe liên quan: ${vehicleRef}. Giá trị thực tế: ${formatMetricValue(alert?.actualValue ?? alert?.rawValue)} • Ngưỡng: ${formatMetricValue(alert?.thresholdValue)}.`,
        actions: [
          'Mở nhật ký quy tắc để xác định chính xác điều kiện kích hoạt.',
          'Đối chiếu dòng thời gian bản đồ và telemetry cùng thời điểm.',
          'Ghi rõ nguyên nhân thực tế vào ghi chú xử lý trước khi đóng.',
        ],
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

    const canUseMap = () => {
      try {
        return map.getContainer().isConnected;
      } catch {
        return false;
      }
    };
    const safeStop = () => {
      if (!canUseMap()) {
        return;
      }

      try {
        map.stop();
      } catch {
        // Ignore stop calls after the alert dialog begins unmounting.
      }
    };

    const syncMap = () => {
      if (!canUseMap()) {
        return;
      }

      safeStop();
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
      safeStop();
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
  const displayTitle = stripAlertMarkup(alert?.displayTitle ?? alert?.title, 'Chi tiết cảnh báo');
  const displayMessage = stripAlertMarkup(
    alert?.displayMessage ?? alert?.message,
    'Cảnh báo này chưa có mô tả chi tiết từ hệ thống phát sinh.',
  );
  const explanation = buildAlertExplanation(alert, displayMessage);
  const resolutionNotes = stripAlertMarkup(alert?.resolutionNotes, 'Chưa có ghi chú xử lý.');
  const mapIcon = useMemo(
    () =>
      createDeviceMarkerIcon(
        alert?.status === 'resolved'
          ? 'stopped'
          : alert?.severity === 'critical'
            ? 'error'
            : 'running',
      ),
    [alert?.severity, alert?.status],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92dvh,920px)] max-h-[92dvh] w-[min(96vw,1220px)] max-w-none flex-col overflow-hidden p-0 sm:w-[min(96vw,1220px)] sm:max-w-none">
        <DialogHeader className="shrink-0 space-y-3 border-b bg-background px-5 py-4 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant={alert?.severity === 'critical' ? 'destructive' : 'secondary'}>
              {getAlertSeverityLabel(alert?.severity)}
            </Badge>
            <Badge variant={alert?.status === 'active' ? 'default' : 'outline'}>
              {getAlertStatusLabel(alert?.status)}
            </Badge>
            <Badge variant="outline">
              {getAlertTypeLabel(alert?.alertType)}
            </Badge>
          </div>

          <div className="space-y-1">
            <DialogTitle>{displayTitle}</DialogTitle>
            <DialogDescription>{displayMessage}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden px-5 py-4 sm:px-6">
          <div className="grid h-full gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)]">
            <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
              <Card className="border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-2 2xl:grid-cols-4">
                  <InfoRow label="Phát sinh" value={formatDateTime(alert?.createdAt)} />
                  <InfoRow
                    label="Cập nhật gần nhất"
                    value={
                      alert?.updatedAt
                        ? `${formatDateTime(alert.updatedAt)} (${formatRelative(alert.updatedAt)})`
                        : 'Chưa có dữ liệu'
                    }
                  />
                  <InfoRow label="Giá trị thực tế" value={formatMetricValue(alert?.actualValue)} />
                  <InfoRow
                    label="Ngưỡng cảnh báo"
                    value={formatMetricValue(alert?.thresholdValue)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Thông tin cảnh báo</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                    value={alert?.customerName ?? 'Chưa có thông tin khách hàng'}
                  />
                  <InfoRow
                    label="Chuyến đi"
                    value={
                      alert?.tripCode ??
                      (alert?.tripId ? String(alert.tripId) : 'Không gắn chuyến đi')
                    }
                  />
                  <InfoRow
                    label="Vùng"
                    value={
                      alert?.geofenceName ??
                      (alert?.geofenceId ? String(alert.geofenceId) : 'Không gắn vùng')
                    }
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
                <CardContent className="space-y-3">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <InfoRow label="Diễn giải" value={explanation.summary} />
                    <InfoRow label="Thông số nhận diện" value={explanation.trigger} />
                  </div>
                  <div className="rounded-xl border bg-muted/20 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      Hướng xử lý đề xuất
                    </p>
                    <div className="mt-2 space-y-2">
                      {explanation.actions.map((item: string, index: number) => (
                        <p key={`${item}-${index}`} className="text-sm leading-relaxed text-foreground">
                          <span className="mr-1 font-semibold">{index + 1}.</span>
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                  <InfoRow label="Ghi chú xử lý" value={resolutionNotes} />
                </CardContent>
              </Card>
            </div>

            <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vị trí phát sinh</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoRow
                      label="Tọa độ"
                      value={
                        hasCoordinates
                          ? `${coordinates.lat.toFixed(5)}, ${coordinates.lon.toFixed(5)}`
                          : 'Cảnh báo này không có tọa độ hợp lệ'
                      }
                    />
                    <InfoRow
                      label="Thời điểm cần lưu ý"
                      value={formatDateTime(alert?.updatedAt ?? alert?.createdAt)}
                    />
                  </div>

                  <div className="h-[320px] overflow-hidden rounded-xl border 2xl:h-[360px]">
                    {hasCoordinates ? (
                      <MapContainer
                        key={alert?.id ?? `${coordinates.lat}-${coordinates.lon}`}
                        center={[coordinates.lat, coordinates.lon]}
                        zoom={14}
                        className="h-full w-full"
                        zoomAnimation={false}
                        fadeAnimation={false}
                        markerZoomAnimation={false}
                      >
                        <AlertDetailMapSync lat={coordinates.lat} lon={coordinates.lon} open={open} />
                        <TileLayer
                          attribution={MAP_LAYER_CONFIG.street.attribution}
                          url={MAP_LAYER_CONFIG.street.url}
                        />
                        <Marker position={[coordinates.lat, coordinates.lon]} icon={mapIcon} />
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Dòng thời gian xử lý</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
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
                    <p className="mt-2 text-sm text-muted-foreground">{resolutionNotes}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Snapshot sự kiện</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="ID cảnh báo" value={formatMetricValue(alert?.id)} />
                  <InfoRow
                    label="Mức nghiêm trọng"
                    value={getAlertSeverityLabel(alert?.severity, formatMetricValue(alert?.severity))}
                  />
                  <InfoRow
                    label="Nguồn phản ứng"
                    value={formatMetricValue(alert?.source ?? alert?.deviceName ?? alert?.deviceId)}
                  />
                  <InfoRow
                    label="Giá trị thô"
                    value={formatMetricValue(alert?.rawValue ?? alert?.actualValue)}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
