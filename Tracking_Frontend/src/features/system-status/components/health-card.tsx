'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ServiceHealthItem } from '@/features/system-status/hooks/use-system-status';
import { StatusBadge } from './status-badge';
export const HealthCard = ({ service }: { service: ServiceHealthItem }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">{service.label}</CardTitle>
        <StatusBadge status={service.status} />
      </CardHeader>
      <CardContent className="space-y-1 text-xs text-muted-foreground">
        <p>Key: {service.key}</p>
        {service.latencyMs ? <p>Latency: {service.latencyMs}ms</p> : null}
        {service.error ? <p className="text-rose-600">{service.error}</p> : null}
      </CardContent>
    </Card>
  );
};
