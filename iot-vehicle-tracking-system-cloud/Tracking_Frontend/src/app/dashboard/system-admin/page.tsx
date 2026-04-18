'use client';

import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRoleAccess } from '@/hooks/use-role-access';
import { useSystemAdminHealth } from '@/features/system-admin/hooks/use-system-admin';
import { LogsViewer } from '@/features/system-admin/components/logs-viewer';
import { QueryBuilder } from '@/features/system-admin/components/query-builder';
import { MetricsExplorer } from '@/features/system-admin/components/metrics-explorer';
import { StatusBadge } from '@/features/system-status/components/status-badge';

type AdminTab = 'logs' | 'query' | 'metrics';

const SystemAdminPage = () => {
  const access = useRoleAccess();
  const [tab, setTab] = useState<AdminTab>('logs');
  const healthQuery = useSystemAdminHealth(access.canAccessSystemAdmin);

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

  return (
    <PageContainer
      pageTitle="Quản trị hệ thống"
      pageDescription="Theo dõi sức khỏe dịch vụ, log, truy vấn PostgreSQL và kiểm tra chỉ số vận hành tại một nơi."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Trạng thái chung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              {health ? <StatusBadge status={health.status} /> : <span>Đang tải...</span>}
              <span>{health ? 'Dữ liệu thật từ backend' : 'Đang tải trạng thái...'}</span>
            </div>
            <p>Tổng dịch vụ: {serviceCount}</p>
            <p>Suy giảm: {degradedCount}</p>
            <p>Ngừng: {downCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Duyệt PostgreSQL</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Chọn bảng, lọc theo từ khóa hoặc khoảng thời gian, rồi duyệt từng trang kết quả.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Chỉ số</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>PromQL chạy trực tiếp lên VictoriaMetrics.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Nhật ký</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Truy vấn VictoriaLogs theo mức log, từ khóa và thời gian.</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as AdminTab)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto">
          <TabsTrigger value="logs">Nhật ký</TabsTrigger>
          <TabsTrigger value="query">PostgreSQL</TabsTrigger>
          <TabsTrigger value="metrics">Chỉ số</TabsTrigger>
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
      </Tabs>
    </PageContainer>
  );
};

export default SystemAdminPage;
