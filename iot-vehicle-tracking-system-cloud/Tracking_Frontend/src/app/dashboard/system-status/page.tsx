'use client';

import { useMemo } from 'react';
import { Activity, AlertTriangle, Database, HardDrive, MemoryStick, Server } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRoleAccess } from '@/hooks/use-role-access';
import { formatDateTime } from '@/lib/utils/date/format';
import { HealthCard } from '@/features/system-status/components/health-card';
import { MetricCard } from '@/features/system-status/components/metric-card';
import { useSystemStatus } from '@/features/system-status/hooks/use-system-status';

const SystemStatusPage = () => {
  const access = useRoleAccess();
  const { services, metrics, healthQuery, healthNotice, metricsNotice } =
    useSystemStatus(access.canViewSystemInfo);

  const serviceSummary = useMemo(() => {
    return services.reduce(
      (acc, service) => {
        acc.total += 1;
        acc[service.status] += 1;
        return acc;
      },
      { total: 0, up: 0, degraded: 0, down: 0 },
    );
  }, [services]);

  const lastCheckedAt = healthQuery.data?.timestamp
    ? formatDateTime(healthQuery.data.timestamp)
    : 'Chưa có dữ liệu';

  if (!access.canViewSystemInfo) {
    return (
      <PageContainer pageTitle="Trạng thái hệ thống" pageDescription="Khu vực hạn chế">
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Bạn không có quyền xem thông tin sức khỏe hệ thống.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      pageTitle="Trạng thái hệ thống"
      pageDescription="Theo dõi Backend API, PostgreSQL, EMQX, MQTT Bridge, VictoriaMetrics, VictoriaLogs và Grafana trên một màn hình."
    >
      {(healthNotice || metricsNotice) && (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              {healthNotice ? <p>Health check đang có vấn đề: {healthNotice}</p> : null}
              {metricsNotice ? <p>Telemetry hạ tầng chưa sẵn sàng: {metricsNotice}</p> : null}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tổng quan sức khỏe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Tổng dịch vụ: {serviceSummary.total}</p>
            <p>Hoạt động: {serviceSummary.up}</p>
            <p>Suy giảm: {serviceSummary.degraded}</p>
            <p>Ngừng: {serviceSummary.down}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lần kiểm tra gần nhất</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>{lastCheckedAt}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">API & Database</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Backend API + PostgreSQL được kiểm tra trực tiếp bởi backend.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Telemetry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Dữ liệu hạ tầng được làm mới mỗi 30 giây.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {services.length > 0 ? (
          services.map((service) => <HealthCard key={service.key} service={service} />)
        ) : (
          <Card className="sm:col-span-2 xl:col-span-3">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Chưa có dữ liệu health check để hiển thị.
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Mức sử dụng CPU"
          value={metrics?.cpuUsage}
          icon={<Server className="h-4 w-4" />}
          showProgress
          unit="%"
          unavailableText={metricsNotice}
        />
        <MetricCard
          title="Mức sử dụng bộ nhớ"
          value={metrics?.memoryUsage}
          icon={<MemoryStick className="h-4 w-4" />}
          showProgress
          unit="%"
          unavailableText={metricsNotice}
        />
        <MetricCard
          title="Mức sử dụng ổ đĩa"
          value={metrics?.diskUsage}
          icon={<HardDrive className="h-4 w-4" />}
          showProgress
          unit="%"
          unavailableText={metricsNotice}
        />
        <MetricCard
          title="Kết nối đang mở"
          value={metrics?.activeConnections}
          icon={<Activity className="h-4 w-4" />}
          unavailableText={metricsNotice}
        />
      </div>

      <Card>
        <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          Các số liệu này dựa trên kiểm tra thật từ backend, không phải mock. Nếu một dịch vụ bị
          down hoặc chưa có tín hiệu gần đây, thẻ tương ứng sẽ ghi rõ trạng thái và lý do.
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default SystemStatusPage;
