'use client';

import { useState } from 'react';
import { WifiOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useRealtimeContext,
  type RealtimeNamespace,
} from '@/components/providers/socket-provider';

const coreNamespaces: RealtimeNamespace[] = ['dashboard', 'devices', 'notifications', 'exports'];
const namespaceLabels: Record<RealtimeNamespace, string> = {
  dashboard: 'tổng quan',
  devices: 'thiết bị',
  notifications: 'thông báo',
  exports: 'xuất dữ liệu',
  firmware: 'firmware',
};

export const ConnectionBanner = () => {
  const { statuses } = useRealtimeContext();
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(null);
  const unavailableNamespaces = coreNamespaces.filter(
    (namespace) => statuses[namespace] !== 'connected',
  );

  if (unavailableNamespaces.length === 0) return null;

  const hasDisconnected = unavailableNamespaces.some(
    (namespace) => statuses[namespace] === 'disconnected',
  );
  const label = unavailableNamespaces.map((namespace) => namespaceLabels[namespace]).join(', ');
  const message = hasDisconnected
    ? `Mất kết nối realtime: ${label}. Đang thử kết nối lại...`
    : `Đang kết nối realtime: ${label}...`;
  const bannerSignature = unavailableNamespaces
    .map((namespace) => `${namespace}:${statuses[namespace]}`)
    .join('|');

  if (dismissedSignature === bannerSignature) return null;

  return (
    <div
      role={hasDisconnected ? 'alert' : 'status'}
      aria-live={hasDisconnected ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={
        hasDisconnected
          ? 'flex min-h-10 items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-sm text-destructive-foreground'
          : 'flex min-h-10 items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm text-amber-950'
      }
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span className="min-w-0">{message}</span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Ẩn cảnh báo kết nối realtime"
        title="Ẩn"
        className={
          hasDisconnected
            ? 'ml-2 h-7 w-7 shrink-0 text-destructive-foreground hover:bg-destructive-foreground/15 hover:text-destructive-foreground'
            : 'ml-2 h-7 w-7 shrink-0 text-amber-950 hover:bg-amber-950/10 hover:text-amber-950'
        }
        onClick={() => setDismissedSignature(bannerSignature)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
