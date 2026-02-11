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
      <PageContainer pageTitle="System admin" pageDescription="Restricted area">
        <Card>
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            You do not have permission to access this module.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }
  return (
    <PageContainer
      pageTitle="System admin"
      pageDescription="Logs viewer, query builder, and metrics explorer"
    >
      <Tabs value={tab} onValueChange={(value) => setTab(value as AdminTab)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto">
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="query">Query builder</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
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
