'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSocket } from '@/components/providers/socket-provider';

export function useRealtimeEvents() {
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const onAlert = (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (payload?.severity === 'critical') toast.error(payload.title ?? 'Cảnh báo mức nghiêm trọng');
      else if (payload?.severity === 'high') toast.warning(payload.title ?? 'Cảnh báo mức cao');
      else toast.info(payload?.title ?? 'Cảnh báo mới');
    };

    const onExportReady = () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Xuất dữ liệu hoàn tất');
    };

    const onGeofenceEnter = (payload: any) => toast.warning(`${payload?.deviceId ?? 'Thiết bị'} vào vùng giám sát ${payload?.geofenceName ?? ''}`);
    const onGeofenceExit = (payload: any) => toast.info(`${payload?.deviceId ?? 'Thiết bị'} ra khỏi vùng giám sát ${payload?.geofenceName ?? ''}`);

    socket.on('alert:new', onAlert);
    socket.on('export:ready', onExportReady);
    socket.on('geofence:enter', onGeofenceEnter);
    socket.on('geofence:exit', onGeofenceExit);
    socket.on('stats:update', () => queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }));
    socket.on('activity:new', () => queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] }));
    socket.on('device:session_start', () => queryClient.invalidateQueries({ queryKey: ['devices'] }));
    socket.on('device:session_end', () => queryClient.invalidateQueries({ queryKey: ['devices'] }));
    socket.on('command:ack', () => queryClient.invalidateQueries({ queryKey: ['device-commands'] }));

    return () => {
      socket.off('alert:new', onAlert);
      socket.off('export:ready', onExportReady);
      socket.off('geofence:enter', onGeofenceEnter);
      socket.off('geofence:exit', onGeofenceExit);
      socket.off('stats:update');
      socket.off('activity:new');
      socket.off('device:session_start');
      socket.off('device:session_end');
      socket.off('command:ack');
    };
  }, [socket, queryClient]);
}

