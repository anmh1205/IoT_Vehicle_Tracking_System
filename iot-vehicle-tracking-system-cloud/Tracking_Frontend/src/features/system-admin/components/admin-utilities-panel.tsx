'use client';

import Link from 'next/link';
import { Activity, BellRing, BookOpenText, ExternalLink, RadioTower, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL } from '@/lib/api/base-url';
import type { SystemAdminHealthResponse } from '@/lib/api/system-admin';
import { StatusBadge } from '@/features/system-status/components/status-badge';

const formatUptime = (uptimeSeconds?: number) => {
  if (!uptimeSeconds || uptimeSeconds <= 0) {
    return 'Chưa có số liệu uptime';
  }

  const totalMinutes = Math.floor(uptimeSeconds / 60);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
};

const getBackendOrigin = () => {
  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4001';
    return new URL(API_BASE_URL, baseUrl).origin;
  } catch {
    return 'http://localhost:4000';
  }
};

export const AdminUtilitiesPanel = ({
  health,
}: {
  health?: SystemAdminHealthResponse;
}) => {
  const backendOrigin = getBackendOrigin();
  const quickRoutes = [
    {
      title: 'Cảnh báo chưa xử lý',
      description: 'Đi thẳng tới hàng đợi cảnh báo để chốt xử lý sự cố đang mở.',
      href: '/dashboard/attention/queue',
      icon: BellRing,
    },
    {
      title: 'Bảo trì',
      description: 'Mở không gian điều phối bảo trì theo lịch, OBD và trạng thái xe.',
      href: '/dashboard/attention/maintenance',
      icon: Wrench,
    },
    {
      title: 'Trạng thái hệ thống',
      description: 'Kiểm tra heartbeat, độ trễ và nguyên nhân suy giảm của từng service.',
      href: '/dashboard/platform/system-status',
      icon: Activity,
    },
    {
      title: 'Firmware / OTA',
      description: 'Đối chiếu đợt OTA gần nhất, lỗi triển khai và firmware đang lệch bản kích hoạt.',
      href: '/dashboard/platform/firmware',
      icon: RadioTower,
    },
  ];

  const checks = health?.checks ?? {};
  const checkEntries = Object.entries(checks);
  const findCheckStatus = (matcher: RegExp): 'ok' | 'degraded' | 'down' | 'unknown' => {
    const found = checkEntries.find(([name]) => matcher.test(name.toLowerCase()));
    return found?.[1]?.status ?? 'unknown';
  };

  type EndpointStatus = 'ok' | 'degraded' | 'down' | 'unknown';

  const endpoints: Array<{
    title: string;
    href: string;
    note: string;
    status: EndpointStatus;
  }> = [
    {
      title: 'API docs',
      href: `${backendOrigin}/api-docs`,
      note: 'Swagger để kiểm tra hợp đồng API và thử API.',
      status: health?.status ?? 'unknown',
    },
    {
      title: 'REST health',
      href: `${backendOrigin}/health`,
      note: 'Kiểm tra trạng thái tổng của backend.',
      status: findCheckStatus(/api|backend|rest/),
    },
    {
      title: 'WS health',
      href: `${backendOrigin}/ws-health`,
      note: 'Xác nhận cổng realtime còn sẵn sàng.',
      status: findCheckStatus(/ws|socket|realtime/),
    },
  ];

  const attentionServices = Object.entries(health?.checks ?? {}).filter(
    ([, check]) => check.status === 'degraded' || check.status === 'down',
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lối tắt tác vụ vận hành</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {quickRoutes.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.href} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  <Button asChild variant="outline" size="sm" className="mt-4">
                    <Link href={item.href}>Mở không gian làm việc</Link>
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Điểm truy cập nền tảng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                {health ? <StatusBadge status={health.status} /> : <Badge variant="outline">Đang tải</Badge>}
                <span className="text-sm text-muted-foreground">
                  Uptime backend: {formatUptime(health?.uptime)}
                </span>
              </div>
            </div>

            {endpoints.map((endpoint) => (
              <div key={endpoint.href} className="rounded-2xl border border-border/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{endpoint.title}</p>
                      {endpoint.status !== 'unknown' ? <StatusBadge status={endpoint.status} /> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{endpoint.note}</p>
                    <p className="text-xs text-muted-foreground">{endpoint.href}</p>
                  </div>
                  <Button asChild variant="outline" size="icon" className="shrink-0">
                    <a href={endpoint.href} target="_blank" rel="noreferrer" aria-label={`Mở ${endpoint.title}`}>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dịch vụ cần chú ý</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {attentionServices.length > 0 ? (
            attentionServices.map(([serviceName, check]) => (
              <div
                key={serviceName}
                className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 md:flex-row md:items-start md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BookOpenText className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">{serviceName}</p>
                    <StatusBadge status={check.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {check.error ?? 'Dịch vụ đang ở trạng thái suy giảm, cần mở nhật ký hoặc không gian làm việc liên quan để xác nhận nguyên nhân.'}
                  </p>
                  {check.endpoint ? <p className="text-xs text-muted-foreground">{check.endpoint}</p> : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
              Chưa ghi nhận dịch vụ suy giảm hoặc ngừng hoạt động ở lần kiểm tra gần nhất.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
