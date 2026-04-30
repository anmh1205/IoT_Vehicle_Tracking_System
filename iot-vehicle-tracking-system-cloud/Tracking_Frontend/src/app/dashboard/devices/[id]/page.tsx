'use client';

import { use, useEffect } from 'react';
import { Cpu, Database, HardDrive, MapPin, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatCard } from '@/components/common/stat-card';
import {
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANTS,
} from '@/features/devices/components/device-constants';
import { useDeviceDetail } from '@/features/devices/hooks/use-device-detail';
import { formatDateTime, formatDuration, formatRelative } from '@/lib/utils/date/format';

const DeviceDetailPage = ({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) => {
  const { id } = use(params);
  const deviceId = Number(id);
  const query = useDeviceDetail(Number.isFinite(deviceId) ? deviceId : null);

  useEffect(() => {
    if (query.isLoading || typeof window === 'undefined') {
      return;
    }

    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) {
      return;
    }

    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [id, query.isLoading]);

  if (query.isError) {
    return (
      <PageContainer pageTitle={`Thiết bị #${id}`} pageDescription="Chi tiết">
        <EmptyState
          title="Không thể tải dữ liệu"
          description="Không thể lấy thông tin thiết bị. Vui lòng thử lại."
          action={{ label: 'Thử lại', onClick: () => void query.refetch() }}
        />
      </PageContainer>
    );
  }

  const detail = query.data?.device;
  const runtime = query.data?.runtime;
  const recentErrors = (Array.isArray(query.data?.errors) ? query.data.errors : []).slice(0, 6);
  const configEntries = Object.entries(detail?.config ?? {});
  const hasValidLocation =
    detail?.latitude !== null &&
    detail?.latitude !== undefined &&
    detail?.longitude !== null &&
    detail?.longitude !== undefined &&
    Number.isFinite(detail.latitude) &&
    Number.isFinite(detail.longitude) &&
    !(detail.latitude === 0 && detail.longitude === 0);
  const pageTitle = detail?.deviceName ?? detail?.deviceId ?? `Thiết bị #${id}`;
  const pageDescription =
    detail?.vehiclePlate || detail?.customerName
      ? `Theo dõi runtime, lỗi và telemetry của ${detail.deviceId ?? 'thiết bị'}`
      : 'Thiết bị này chưa được gắn đầy đủ xe/khách hàng.';

  return (
    <PageContainer pageTitle={pageTitle} pageDescription={pageDescription}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Trạng thái"
          value={DEVICE_STATUS_LABELS[detail?.currentStatus ?? ''] ?? detail?.currentStatus ?? '-'}
          icon={<Cpu className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
        <StatCard
          title="Tổng runtime"
          value={formatDuration(runtime?.totalRuntime ?? 0)}
          icon={<HardDrive className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
        <StatCard
          title="Tổng phiên"
          value={runtime?.totalSessions ?? 0}
          icon={<Database className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
        <StatCard
          title="Mã lỗi gần đây"
          value={
            detail?.lastErrorCode !== null && detail?.lastErrorCode !== undefined
              ? detail.lastErrorCode
              : '-'
          }
          icon={<ShieldAlert className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
      </div>

      {detail ? (
        <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={DEVICE_STATUS_VARIANTS[detail.currentStatus] ?? 'secondary'}>
                    {DEVICE_STATUS_LABELS[detail.currentStatus] ?? detail.currentStatus}
                  </Badge>
                  {detail.vehiclePlate ? <Badge variant="outline">{detail.vehiclePlate}</Badge> : null}
                  {detail.customerName ? <Badge variant="outline">{detail.customerName}</Badge> : null}
                </div>
                <div>
                  <p className="text-2xl font-semibold tracking-tight">
                    {detail.deviceName ?? 'Thiết bị chưa có tên hiển thị'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {detail.deviceId ? `Mã thiết bị: ${detail.deviceId}` : 'Chưa cấu hình mã thiết bị'}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:w-[25rem]">
                <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">IMEI</p>
                  <p className="mt-1 text-sm font-medium">{detail.imei ?? 'Chưa có'}</p>
                </div>
                <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Firmware</p>
                  <p className="mt-1 text-sm font-medium">{detail.firmwareVersion ?? 'Chưa có'}</p>
                </div>
                <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Chu kỳ gửi</p>
                  <p className="mt-1 text-sm font-medium">{detail.requestInterval ?? 60}s</p>
                </div>
                <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Cập nhật gần nhất
                  </p>
                  <p className="mt-1 text-sm font-medium">{formatRelative(detail.lastSeenAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Snapshot telemetry</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Vị trí</p>
              <p className="mt-1 text-sm font-medium">
                {hasValidLocation
                  ? `${detail?.latitude?.toFixed(5)}, ${detail?.longitude?.toFixed(5)}`
                  : 'Chưa có tọa độ hợp lệ'}
              </p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Uptime phiên
              </p>
              <p className="mt-1 text-sm font-medium">
                {detail?.currentSession ? formatDuration(detail.currentSession.uptime ?? 0) : '-'}
              </p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Session hiện tại</p>
              <p className="mt-1 text-sm font-medium">
                {detail?.currentSession
                  ? `${DEVICE_STATUS_LABELS[detail.currentSession.status] ?? detail.currentSession.status}`
                  : 'Chưa có'}
              </p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Dữ liệu phiên</p>
              <p className="mt-1 text-sm font-medium">
                {detail?.currentSession ? `${detail.currentSession.dataPointsCount} điểm` : '-'}
              </p>
            </div>
            {hasValidLocation ? (
              <div className="sm:col-span-2">
                <Button asChild variant="outline">
                  <a
                    href={`https://maps.google.com/?q=${detail?.latitude},${detail?.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Mở vị trí thiết bị trên bản đồ
                  </a>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Runtime tổng hợp</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Tổng runtime</p>
              <p className="mt-1 text-sm font-medium">{formatDuration(runtime?.totalRuntime ?? 0)}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Tổng phiên</p>
              <p className="mt-1 text-sm font-medium">{runtime?.totalSessions ?? 0}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Phiên TB</p>
              <p className="mt-1 text-sm font-medium">{formatDuration(runtime?.avgSessionDuration ?? 0)}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Điểm dữ liệu</p>
              <p className="mt-1 text-sm font-medium">{runtime?.totalDataPoints ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Phiên chạy gần đây</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail?.recentSessions && detail.recentSessions.length > 0 ? (
              detail.recentSessions.slice(0, 6).map((session) => (
                <div
                  key={session.id}
                  className="grid gap-3 rounded-xl border bg-muted/20 px-3 py-3 text-sm md:grid-cols-4"
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
              <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Backend chưa trả về lịch sử phiên chạy cho thiết bị này.
              </div>
            )}
          </CardContent>
        </Card>

        <Card id="recent-errors" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-base">Lỗi gần đây</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentErrors.length > 0 ? (
              recentErrors.map((error: any, index: number) => (
                <div key={error.id ?? index} className="rounded-xl border bg-muted/20 px-3 py-3 text-sm">
                  <p className="font-medium">
                    Mã lỗi {error.errorCode ?? error.code ?? 'không rõ'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {error.errorName ?? error.name ?? error.description ?? 'Chưa có mô tả lỗi'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(error.occurredAt ?? error.occurred_at ?? error.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Chưa ghi nhận lỗi gần đây từ thiết bị.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cấu hình đồng bộ</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {configEntries.length > 0 ? (
            configEntries.slice(0, 12).map(([key, value]) => (
              <div key={key} className="rounded-xl border bg-muted/20 px-3 py-2.5 text-sm">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{key}</p>
                <p className="mt-1 break-all font-medium">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-full rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
              Thiết bị chưa có cấu hình mở rộng được đồng bộ.
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default DeviceDetailPage;
