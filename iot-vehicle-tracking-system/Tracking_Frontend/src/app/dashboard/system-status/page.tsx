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
      <PageContainer pageTitle="System status" pageDescription="Restricted area">
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            You do not have permission to access system health details.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }
  return (
    <PageContainer
      pageTitle="System status"
      pageDescription="Service health and infrastructure metrics"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {services.map((service) => (
          <HealthCard key={service.key} service={service} />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="CPU usage"
          value={metrics.cpuUsage}
          icon={<Server className="h-4 w-4" />}
          showProgress
          unit="%"
        />
        <MetricCard
          title="Memory usage"
          value={metrics.memoryUsage}
          icon={<MemoryStick className="h-4 w-4" />}
          showProgress
          unit="%"
        />
        <MetricCard
          title="Disk usage"
          value={metrics.diskUsage}
          icon={<HardDrive className="h-4 w-4" />}
          showProgress
          unit="%"
        />
        <MetricCard
          title="Connections"
          value={metrics.activeConnections}
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          Metrics are refreshed every 30 seconds.
        </CardContent>
      </Card>
    </PageContainer>
  );
};
export default SystemStatusPage;
