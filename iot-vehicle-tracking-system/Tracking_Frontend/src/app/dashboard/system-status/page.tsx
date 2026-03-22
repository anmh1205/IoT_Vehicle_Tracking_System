'use client';

import { Activity, AlertTriangle, Database, HardDrive, MemoryStick, Server } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { useRoleAccess } from '@/hooks/use-role-access';
import { HealthCard } from '@/features/system-status/components/health-card';
import { MetricCard } from '@/features/system-status/components/metric-card';
import { useSystemStatus } from '@/features/system-status/hooks/use-system-status';

const SystemStatusPage = () => {
  const access = useRoleAccess();
  const { services, metrics, healthNotice, metricsNotice } = useSystemStatus(access.canViewSystemInfo);

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
      pageDescription="Theo dõi tình trạng dịch vụ và telemetry hạ tầng theo thời gian gần thực."
    >
      {healthNotice || metricsNotice ? (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              {healthNotice ? <p>Health check đang suy giảm: {healthNotice}</p> : null}
              {metricsNotice ? <p>Metrics hạ tầng chưa sẵn sàng: {metricsNotice}</p> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {services.length > 0 ? (
          services.map((service) => <HealthCard key={service.key} service={service} />)
        ) : (
          <Card className="sm:col-span-2 xl:col-span-4">
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
          Dữ liệu được làm mới mỗi 30 giây. Nếu endpoint metrics không phản hồi, giao diện sẽ
          hiển thị trạng thái thiếu telemetry thay vì nội suy số liệu.
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default SystemStatusPage;
