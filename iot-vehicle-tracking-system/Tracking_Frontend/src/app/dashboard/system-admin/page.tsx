'use client';
import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRoleAccess } from '@/hooks/use-role-access';
import { LogsViewer } from '@/features/system-admin/components/logs-viewer';
import { QueryBuilder } from '@/features/system-admin/components/query-builder';
import { MetricsExplorer } from '@/features/system-admin/components/metrics-explorer';
type AdminTab = 'logs' | 'query' | 'metrics';
const SystemAdminPage = () => {
  const access = useRoleAccess();
  const [tab, setTab] = useState<AdminTab>('logs');
  if (!access.canAccessSystemAdmin) {
    return (
      <PageContainer pageTitle="Quản trị hệ thống" pageDescription="Khu vực hạn chế">
        <Card>
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Bạn không có quyền truy cập phân hệ này.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }
  return (
    <PageContainer
      pageTitle="Quản trị hệ thống"
      pageDescription="Trình xem nhật ký, công cụ truy vấn và khám phá chỉ số"
    >
      <Tabs value={tab} onValueChange={(value) => setTab(value as AdminTab)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto">
          <TabsTrigger value="logs">Nhật ký</TabsTrigger>
          <TabsTrigger value="query">Truy vấn</TabsTrigger>
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
