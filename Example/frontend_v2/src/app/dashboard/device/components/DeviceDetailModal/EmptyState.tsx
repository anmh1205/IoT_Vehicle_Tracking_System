'use client';

import { Inbox, Database, ChartBar } from 'lucide-react';
import { DEVICE_RADIUS, DEVICE_SHADOWS } from '../device-design-constants';

export function EmptyState({ message, icon }: { message: string; icon?: 'inbox' | 'database' | 'chart' }) {
  const getIcon = () => {
    switch (icon) {
      case 'database':
        return <Database className='h-8 w-8 text-muted-foreground' />;
      case 'chart':
        return <ChartBar className='h-8 w-8 text-muted-foreground' />;
      default:
        return <Inbox className='h-8 w-8 text-muted-foreground' />;
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center ${DEVICE_RADIUS.md} border border-border/60 bg-gradient-to-b from-muted/30 to-muted/50 px-6 py-12 ring-2 ring-inset ring-border/60 ${DEVICE_SHADOWS.sm}`}
    >
      <div className='mb-3 rounded-full border border-border/60 bg-background/60 p-3 shadow-sm'>{getIcon()}</div>
      <p className='text-sm font-medium text-muted-foreground text-center'>{message}</p>
    </div>
  );
}

