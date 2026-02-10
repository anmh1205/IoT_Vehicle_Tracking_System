'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { systemAdminServices } from '@/lib/api/system-admin';
import { VMQueryViewer } from '@/features/admin/components/vm-query-viewer';
import { VLLogViewer } from '@/features/admin/components/vl-log-viewer';
import { SystemSettingsEditor } from '@/features/admin/components/system-settings-editor';

export default function SystemAdminPage() {
  const [promql, setPromql] = useState('up');
  const [logsql, setLogsql] = useState('*');
  const [table, setTable] = useState('users');
  const [search, setSearch] = useState('');

  const metrics = useQuery({ queryKey: ['sys-metrics', promql], queryFn: () => systemAdminServices.metrics({ query: promql }) });
  const logs = useQuery({ queryKey: ['sys-logs', logsql], queryFn: () => systemAdminServices.logs({ query: logsql, limit: 200 }) });
  const tables = useQuery({ queryKey: ['sys-tables'], queryFn: () => systemAdminServices.listTables() });
  const tableRows = useQuery({ queryKey: ['sys-table-rows', table, search], queryFn: () => systemAdminServices.queryTable(table, { limit: 50, search }) });

  return (
    <PageContainer pageTitle="Quản trị hệ thống" pageDescription="Công cụ quản trị hệ thống">
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList>
          <TabsTrigger value="health">Sức khỏe</TabsTrigger>
          <TabsTrigger value="metrics">Chỉ số</TabsTrigger>
          <TabsTrigger value="logs">Nhật ký</TabsTrigger>
          <TabsTrigger value="tables">Bảng dữ liệu</TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <Card>
            <CardHeader><CardTitle>Tình trạng hệ thống</CardTitle></CardHeader>
            <CardContent><pre className="overflow-auto text-xs">{JSON.stringify(metrics.data, null, 2)}</pre></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <VMQueryViewer data={metrics.data} onRun={(query) => setPromql(query)} />
        </TabsContent>

        <TabsContent value="logs">
          <VLLogViewer data={logs.data} onRun={(query) => setLogsql(query)} />
        </TabsContent>

        <TabsContent value="tables">
          <Card>
            <CardHeader><CardTitle>Trình duyệt bảng</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Select value={table} onValueChange={setTable}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Chọn bảng" />
                  </SelectTrigger>
                  <SelectContent>
                    {(tables.data ?? []).map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Tìm trong bảng" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <SystemSettingsEditor rows={tableRows.data?.items ?? []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

