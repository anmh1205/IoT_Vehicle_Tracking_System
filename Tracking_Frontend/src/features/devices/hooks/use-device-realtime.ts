'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/components/providers/socket-provider';

export const useDeviceRealtime = () => {
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['devices'] });

    socket.on('device:status', refresh);
    socket.on('device:position', refresh);

    return () => {
      socket.off('device:status', refresh);
      socket.off('device:position', refresh);
    };
  }, [socket, queryClient]);
};
