'use client';

import { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleOff,
  HardDrive,
  MemoryStick,
  Server,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatCard } from '@/components/common/stat-card';
import { Card, CardContent } from '@/components/ui/card';
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng dịch vụ kiểm tra"
          value={serviceSummary.total}
          icon={<Server className="h-4 w-4" />}
          subtitle={`Kiểm tra gần nhất: ${lastCheckedAt}`}
          isLoading={healthQuery.isLoading}
        />
        <StatCard
          title="Dịch vụ hoạt động"
          value={serviceSummary.up}
          icon={<CheckCircle2 className="h-4 w-4" />}
          isLoading={healthQuery.isLoading}
        />
        <StatCard
          title="Dịch vụ suy giảm"
          value={serviceSummary.degraded}
          icon={<AlertTriangle className="h-4 w-4" />}
          isLoading={healthQuery.isLoading}
        />
        <StatCard
          title="Dịch vụ ngừng"
          value={serviceSummary.down}
          icon={<CircleOff className="h-4 w-4" />}
          isLoading={healthQuery.isLoading}
        />
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
    </PageContainer>
  );
};

export default SystemStatusPage;
