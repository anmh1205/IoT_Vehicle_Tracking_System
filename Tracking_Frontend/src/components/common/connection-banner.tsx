'use client';

import { useSocket } from '@/components/providers/socket-provider';
import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function ConnectionBanner() {
  const socket = useSocket();
  const [disconnected, setDisconnected] = useState(false);

  useEffect(() => {
    if (!socket) return;
    socket.on('disconnect', () => setDisconnected(true));
    socket.on('connect', () => setDisconnected(false));
    return () => {
      socket.off('disconnect');
      socket.off('connect');
    };
  }, [socket]);

  if (!disconnected) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm text-destructive-foreground">
      <WifiOff className="h-4 w-4" /> Mất kết nối máy chủ. Đang thử kết nối lại...
    </div>
  );
}

