'use client';
import { Activity, Database, HardDrive, MemoryStick, Server } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { useRoleAccess } from '@/hooks/use-role-access';
import { HealthCard } from '@/features/system-status/components/health-card';
import { MetricCard } from '@/features/system-status/components/metric-card';
import { useSystemStatus } from '@/features/system-status/hooks/use-system-status';
const SystemStatusPage = () => {
  const access = useRoleAccess();
  const { services, metrics } = useSystemStatus(access.canViewSystemInfo);
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
      pageDescription="Tình trạng dịch vụ và chỉ số hạ tầng"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {services.map((service) => (
          <HealthCard key={service.key} service={service} />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Mức sử dụng CPU"
          value={metrics.cpuUsage}
          icon={<Server className="h-4 w-4" />}
          showProgress
          unit="%"
        />
        <MetricCard
          title="Mức sử dụng bộ nhớ"
          value={metrics.memoryUsage}
          icon={<MemoryStick className="h-4 w-4" />}
          showProgress
          unit="%"
        />
        <MetricCard
          title="Mức sử dụng ổ đĩa"
          value={metrics.diskUsage}
          icon={<HardDrive className="h-4 w-4" />}
          showProgress
          unit="%"
        />
        <MetricCard
          title="Kết nối"
          value={metrics.activeConnections}
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          Các chỉ số được làm mới sau mỗi 30 giây.
        </CardContent>
      </Card>
    </PageContainer>
  );
};
export default SystemStatusPage;
