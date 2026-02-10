'use client';

import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { healthServices } from '@/lib/api/system-status';
import { Server, Radio, Database, BarChart3, Wifi } from 'lucide-react';

const COMPONENTS = [
  { key: 'backend', label: 'Backend API', icon: Server },
  { key: 'mqtt', label: 'MQTT Bridge', icon: Radio },
  { key: 'postgresql', label: 'PostgreSQL', icon: Database },
  { key: 'victoriametrics', label: 'VictoriaMetrics', icon: BarChart3 },
  { key: 'emqx', label: 'EMQX Broker', icon: Wifi },
];

const STATUS_LABELS: Record<string, string> = {
  healthy: 'Khỏe mạnh',
  up: 'Hoạt động',
  down: 'Dừng',
  unhealthy: 'Lỗi',
};

export default function SystemStatusPage() {
  const health = useQuery({ queryKey: ['health-status'], queryFn: () => healthServices.getHealth(), refetchInterval: 30000 });

  const components = health.data?.components ?? [];

  return (
    <PageContainer pageTitle="Trạng thái hệ thống" pageDescription="Sức khỏe các thành phần hệ thống">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {COMPONENTS.map((item) => {
          const data = components.find((x: any) => x.name === item.key) ?? null;
          const Icon = item.icon;
          const status = data?.status ?? (health.data?.database === 'up' ? 'healthy' : 'down');
          return (
            <Card key={item.key}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">{item.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold">{STATUS_LABELS[status] ?? status}</div>
                <div className="text-xs text-muted-foreground">Độ trễ: {data?.latency ?? '-'} ms</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}

