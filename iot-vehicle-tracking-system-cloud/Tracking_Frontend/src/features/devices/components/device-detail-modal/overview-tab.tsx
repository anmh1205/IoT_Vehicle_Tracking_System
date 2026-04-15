import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeviceStatCard } from '@/features/devices/components/stat-card';
import { DEVICE_STATUS_LABELS } from '@/features/devices/components/device-constants';
import { formatDuration, formatRelative } from '@/lib/utils/date/format';
import { useDeviceDetailModal } from './modal-context';

const formatCoordinate = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }
  return value.toFixed(6);
};

export const OverviewTab = () => {
  const { device, runtime, vibrationChart } = useDeviceDetailModal();
  const latestVibration = vibrationChart[vibrationChart.length - 1];
  const statusLabel =
    DEVICE_STATUS_LABELS[device?.currentStatus ?? ''] ?? device?.currentStatus ?? 'Khong xac dinh';
  const hasCoordinate =
    typeof device?.latitude === 'number' &&
    typeof device?.longitude === 'number' &&
    Number.isFinite(device.latitude) &&
    Number.isFinite(device.longitude);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <DeviceStatCard title="Tong runtime" value={formatDuration(runtime?.totalRuntime ?? 0)} />
        <DeviceStatCard title="Tong phien" value={runtime?.totalSessions ?? 0} />
        <DeviceStatCard title="Rung dong trung binh" value={(runtime?.avgVibration ?? 0).toFixed(2)} />
        <DeviceStatCard title="So diem du lieu" value={runtime?.totalDataPoints ?? 0} />
      </div>

      <Card className="border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{statusLabel}</Badge>
            <Badge variant={device?.vehiclePlate ? 'secondary' : 'outline'}>
              {device?.vehiclePlate ? `Xe: ${device.vehiclePlate}` : 'Chua gan phuong tien'}
            </Badge>
            <Badge variant={device?.customerName ? 'secondary' : 'outline'}>
              {device?.customerName ? `Khach hang: ${device.customerName}` : 'Chua gan khach hang'}
            </Badge>
          </div>

          <div>
            <p className="text-2xl font-semibold tracking-tight">{device?.deviceName ?? 'Thiet bi IoT'}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {device?.deviceId ?? '-'} • cap nhat {formatRelative(device?.lastSeenAt ?? null)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">IMEI</p>
              <p className="mt-1 text-sm font-medium">{device?.imei ?? '-'}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Firmware</p>
              <p className="mt-1 text-sm font-medium">{device?.firmwareVersion ?? '-'}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Chu ky gui</p>
              <p className="mt-1 text-sm font-medium">{device?.requestInterval ?? 60}s</p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Nguong rung</p>
              <p className="mt-1 text-sm font-medium">{device?.vibrationThreshold ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Boi canh van hanh</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Trang thai hien tai</p>
              <p className="font-medium">{statusLabel}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current session</p>
              <p className="font-medium">
                {device?.currentSession?.id ? `#${device.currentSession.id}` : 'Khong co'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bat dau phien</p>
              <p className="font-medium">{formatRelative(device?.currentSession?.serverSessionStart ?? null)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ket thuc phien</p>
              <p className="font-medium">{formatRelative(device?.currentSession?.serverSessionEnd ?? null)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tong runtime tren thiet bi</p>
              <p className="font-medium">{formatDuration(device?.totalRuntimeSeconds ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ma loi gan nhat</p>
              <p className="font-medium">{device?.lastErrorCode ?? '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Snapshot telemetry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">Vibration hien tai</p>
                <p className="font-semibold">{latestVibration ? latestVibration.value.toFixed(2) : '-'}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">Moc du lieu</p>
                <p className="font-semibold">
                  {latestVibration?.timestamp ? formatRelative(latestVibration.timestamp) : '-'}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">So diem rung (bo loc)</p>
                <p className="font-semibold">{vibrationChart.length}</p>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">Toa do</p>
              <p className="mt-1 font-medium">
                {formatCoordinate(device?.latitude)}, {formatCoordinate(device?.longitude)}
              </p>
            </div>

            {hasCoordinate ? (
              <Button asChild variant="outline" size="sm">
                <a href="/dashboard/map">Mo vi tri thiet bi tren ban do</a>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Thiet bi chua co toa do hop le de hien thi tren ban do.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
