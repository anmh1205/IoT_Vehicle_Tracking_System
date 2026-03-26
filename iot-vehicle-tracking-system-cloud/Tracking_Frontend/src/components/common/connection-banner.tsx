'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useSocket } from '@/components/providers/socket-provider';

export const ConnectionBanner = () => {
  const socket = useSocket();
  const [disconnected, setDisconnected] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleDisconnect = () => setDisconnected(true);
    const handleConnect = () => setDisconnected(false);

    socket.on('disconnect', handleDisconnect);
    socket.on('connect', handleConnect);

    return () => {
      socket.off('disconnect', handleDisconnect);
      socket.off('connect', handleConnect);
    };
  }, [socket]);

  if (!disconnected) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm text-destructive-foreground"
    >
      <WifiOff className="h-4 w-4" />
      Mất kết nối máy chủ. Đang thử kết nối lại...
    </div>
  );
};
