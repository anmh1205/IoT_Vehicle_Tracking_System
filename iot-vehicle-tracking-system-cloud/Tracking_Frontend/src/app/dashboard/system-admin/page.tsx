'use client';

import { useState } from 'react';
import { Activity, AlertTriangle, CircleOff, Database, ShieldAlert } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatCard } from '@/components/common/stat-card';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRoleAccess } from '@/hooks/use-role-access';
import { useSystemAdminHealth, useSystemAdminSettings } from '@/features/system-admin/hooks/use-system-admin';
import { AdminUtilitiesPanel } from '@/features/system-admin/components/admin-utilities-panel';
import { LogsViewer } from '@/features/system-admin/components/logs-viewer';
import { QueryBuilder } from '@/features/system-admin/components/query-builder';
import { MetricsExplorer } from '@/features/system-admin/components/metrics-explorer';
import { VictoriaMetricsSettingsPanel } from '@/features/system-admin/components/victoria-metrics-settings-panel';

type AdminTab = 'logs' | 'query' | 'metrics' | 'victoria-metrics' | 'utilities';

const SystemAdminPage = () => {
  const access = useRoleAccess();
  const [tab, setTab] = useState<AdminTab>('logs');
  const healthQuery = useSystemAdminHealth(access.canAccessSystemAdmin);
  const settingsQuery = useSystemAdminSettings(access.canAccessSystemAdmin);

  if (!access.canAccessSystemAdmin) {
    return (
      <PageContainer pageTitle="Quản trị hệ thống" pageDescription="Khu vực hạn chế truy cập">
        <Card>
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Bạn không có quyền truy cập phân hệ này.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const health = healthQuery.data;
  const serviceCount = health ? Object.keys(health.checks).length : 0;
  const degradedCount = health
    ? Object.values(health.checks).filter((check) => check.status === 'degraded').length
    : 0;
  const downCount = health
    ? Object.values(health.checks).filter((check) => check.status === 'down').length
    : 0;
  const attentionCount = degradedCount + downCount;

  const victoriaMetricsSettingsCount = (settingsQuery.data ?? []).filter(
    (setting) => setting.groupName === 'victoria_metrics',
  ).length;

  return (
    <PageContainer
      pageTitle="Quản trị hệ thống"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng dịch vụ kiểm tra"
          value={serviceCount}
          icon={<Activity className="h-4 w-4" />}
          subtitle={health ? `Trạng thái tổng: ${health.status}` : 'Đang tải trạng thái...'}
          isLoading={healthQuery.isLoading}
        />
        <StatCard
          title="Dịch vụ cần chú ý"
          value={attentionCount}
          icon={<AlertTriangle className="h-4 w-4" />}
          isLoading={healthQuery.isLoading}
        />
        <StatCard
          title="Dịch vụ ngừng hoạt động"
          value={downCount}
          icon={<CircleOff className="h-4 w-4" />}
          isLoading={healthQuery.isLoading}
        />
        <StatCard
          title="Cấu hình VictoriaMetrics"
          value={victoriaMetricsSettingsCount}
          icon={<Database className="h-4 w-4" />}
          subtitle={settingsQuery.isError ? 'Không tải được system settings' : undefined}
          isLoading={settingsQuery.isLoading}
        />
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as AdminTab)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 sm:w-auto">
          <TabsTrigger value="logs">Nhật ký</TabsTrigger>
          <TabsTrigger value="query">PostgreSQL</TabsTrigger>
          <TabsTrigger value="metrics">Chỉ số</TabsTrigger>
          <TabsTrigger value="victoria-metrics">VictoriaMetrics</TabsTrigger>
          <TabsTrigger value="utilities">Utilities</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-0">
          <LogsViewer />
        </TabsContent>

        <TabsContent value="query" className="space-y-0">
          <QueryBuilder />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-0">
          <MetricsExplorer />
        </TabsContent>

        <TabsContent value="victoria-metrics" className="space-y-0">
          <VictoriaMetricsSettingsPanel />
        </TabsContent>

        <TabsContent value="utilities" className="space-y-0">
          <AdminUtilitiesPanel health={health} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default SystemAdminPage;
