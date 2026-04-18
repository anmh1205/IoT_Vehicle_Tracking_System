'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ServiceHealthItem } from '@/features/system-status/hooks/use-system-status';
import { StatusBadge } from './status-badge';

export const HealthCard = ({ service }: { service: ServiceHealthItem }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="text-sm">{service.label}</CardTitle>
        <StatusBadge status={service.status} />
      </CardHeader>
      <CardContent className="space-y-1 text-xs text-muted-foreground">
        <p>
          Mã dịch vụ: <span className="font-medium text-foreground">{service.key}</span>
        </p>
        {service.endpoint ? <p>Điểm kiểm tra: {service.endpoint}</p> : null}
        {service.latencyMs !== undefined ? <p>Độ trễ: {service.latencyMs}ms</p> : null}
        {service.lastSeenAt ? <p>Lần ghi nhận gần nhất: {service.lastSeenAt}</p> : null}
        {service.details ? (
          <details className="pt-1">
            <summary className="cursor-pointer text-muted-foreground">Xem chi tiết</summary>
            <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-muted/60 p-2 text-[11px] text-foreground whitespace-pre-wrap">
              {JSON.stringify(service.details, null, 2)}
            </pre>
          </details>
        ) : null}
        {service.error ? <p className="text-rose-600">{service.error}</p> : null}
      </CardContent>
    </Card>
  );
};
