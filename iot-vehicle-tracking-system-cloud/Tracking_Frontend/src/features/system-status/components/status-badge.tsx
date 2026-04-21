'use client';

import { Badge } from '@/components/ui/badge';
import type { ServiceStatus } from '@/features/system-status/hooks/use-system-status';

export const StatusBadge = ({ status }: { status: ServiceStatus | 'ok' }) => {
  if (status === 'up' || status === 'ok') {
    return <Badge variant="default">Hoạt động</Badge>;
  }

  if (status === 'degraded') {
    return <Badge variant="secondary">Suy giảm</Badge>;
  }

  return <Badge variant="destructive">Ngừng</Badge>;
};
