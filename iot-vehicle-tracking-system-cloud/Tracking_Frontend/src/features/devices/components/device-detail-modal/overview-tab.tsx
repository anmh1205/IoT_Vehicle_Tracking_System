import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeviceStatCard } from '@/features/devices/components/stat-card';
import { formatDateTime, formatDuration, formatRelative } from '@/lib/utils/date/format';
import { DEVICE_STATUS_LABELS } from '@/features/devices/components/device-constants';
import { useDeviceDetailModal } from './modal-context';

const hasValidLocation = (latitude: number | null | undefined, longitude: number | null | undefined) =>
  latitude !== null &&
  latitude !== undefined &&
  longitude !== null &&
  longitude !== undefined &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  !(latitude === 0 && longitude === 0);

export const OverviewTab = () => {
  const { device, runtime, vibrationChart } = useDeviceDetailModal();
  const latestVibration = vibrationChart[vibrationChart.length - 1];
  const currentSession = device?.currentSession ?? null;
  const recentSessions = device?.recentSessions ?? [];
  const configEntries = Object.entries(device?.config ?? {});

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <DeviceStatCard title="Tổng runtime" value={formatDuration(runtime?.totalRuntime ?? 0)} />
        <DeviceStatCard title="Tổng phiên" value={runtime?.totalSessions ?? 0} />
        <DeviceStatCard
          title="Thời lượng phiên TB"
          value={formatDuration(runtime?.avgSessionDuration ?? 0)}
        />
        <DeviceStatCard title="Số điểm dữ liệu" value={runtime?.totalDataPoints ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin thiết bị</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">ID thiết bị</p>
            <p className="font-medium">{device?.deviceId ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tên thiết bị</p>
            <p className="font-medium">{device?.deviceName ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Trạng thái</p>
            <p className="font-medium">
              {DEVICE_STATUS_LABELS[device?.currentStatus ?? ''] ?? device?.currentStatus ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cập nhật gần nhất</p>
            <p className="font-medium">{formatRelative(device?.lastSeenAt ?? null)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">IMEI</p>
            <p className="font-medium">{device?.imei ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Firmware</p>
            <p className="font-medium">{device?.firmwareVersion ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Firmware mục tiêu</p>
            <p className="font-medium">{device?.targetFirmwareVersion ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Chu kỳ gửi dữ liệu</p>
            <p className="font-medium">{device?.requestInterval ?? 60}s</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ngưỡng rung động</p>
            <p className="font-medium">{device?.vibrationThreshold ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Biển số xe</p>
            <p className="font-medium">{device?.vehiclePlate ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Khách hàng</p>
            <p className="font-medium">{device?.customerName ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mã lỗi gần nhất</p>
            <p className="font-medium">
              {device?.lastErrorCode !== null && device?.lastErrorCode !== undefined
                ? device.lastErrorCode
                : '-'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ảnh chụp thời gian thực</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Vibration hiện tại</p>
            <p className="font-semibold">
              {latestVibration ? latestVibration.value.toFixed(2) : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mốc dữ liệu</p>
            <p className="font-semibold">
              {latestVibration?.timestamp ? formatRelative(latestVibration.timestamp) : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tọa độ</p>
            <p className="font-semibold">
              {hasValidLocation(device?.latitude, device?.longitude)
                ? `${device?.latitude?.toFixed(5)}, ${device?.longitude?.toFixed(5)}`
                : 'Chưa có vị trí hợp lệ'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Phiên hiện tại</p>
            <p className="font-semibold">
              {currentSession
                ? `${DEVICE_STATUS_LABELS[currentSession.status] ?? currentSession.status} từ ${formatRelative(currentSession.serverSessionStart)}`
                : 'Chưa ghi nhận phiên đang chạy'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.5fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Phiên chạy gần đây</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSessions.length > 0 ? (
              recentSessions.slice(0, 4).map((session) => (
                <div
                  key={session.id}
                  className="grid gap-3 rounded-lg border px-3 py-3 text-sm md:grid-cols-4"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">Trạng thái</p>
                    <p className="font-medium">
                      {DEVICE_STATUS_LABELS[session.status] ?? session.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Bắt đầu</p>
                    <p className="font-medium">{formatDateTime(session.serverSessionStart)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Kết thúc</p>
                    <p className="font-medium">{formatDateTime(session.serverSessionEnd)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Dữ liệu</p>
                    <p className="font-medium">
                      {formatDuration(session.uptime ?? 0)} · {session.dataPointsCount} điểm
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Backend chưa ghi nhận lịch sử phiên chạy cho thiết bị này.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cấu hình nhanh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {configEntries.length > 0 ? (
              configEntries.slice(0, 6).map(([key, value]) => (
                <div key={key} className="rounded-lg border px-3 py-2 text-sm">
                  <p className="text-xs text-muted-foreground">{key}</p>
                  <p className="font-medium break-all">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Chưa có cấu hình mở rộng được đồng bộ từ backend.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
