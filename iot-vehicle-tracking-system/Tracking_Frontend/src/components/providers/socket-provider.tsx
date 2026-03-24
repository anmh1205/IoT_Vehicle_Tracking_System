'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/stores/auth-store';
type RealtimeStatus = 'disconnected' | 'connecting' | 'connected';
interface RealtimeContextValue {
  socket: Socket | null;
  status: RealtimeStatus;
  joinDeviceRoom: (deviceId: string | number) => void;
  leaveDeviceRoom: (deviceId: string | number) => void;
}
const SocketContext = createContext<RealtimeContextValue | null>(null);
export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const token = useAuthStore((s) => s.token);
  useEffect(() => {
    if (!token) {
      setSocket(null);
      setStatus('disconnected');
      return;
    }
    setStatus('connecting');
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    const s = io(wsUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });
    const handleConnect = () => setStatus('connected');
    const handleDisconnect = () => setStatus('disconnected');
    const handleConnectError = () => setStatus('disconnected');
    s.on('connect', handleConnect);
    s.on('disconnect', handleDisconnect);
    s.on('connect_error', handleConnectError);
    setSocket(s);
    return () => {
      s.off('connect', handleConnect);
      s.off('disconnect', handleDisconnect);
      s.off('connect_error', handleConnectError);
      s.disconnect();
      setStatus('disconnected');
    };
  }, [token]);
  const joinDeviceRoom = useCallback(
    (deviceId: string | number) => {
      if (!socket || !deviceId) {
        return;
      }
      socket.emit('device:join', { deviceId: String(deviceId) });
    },
    [socket],
  );
  const leaveDeviceRoom = useCallback(
    (deviceId: string | number) => {
      if (!socket || !deviceId) {
        return;
      }
      socket.emit('device:leave', { deviceId: String(deviceId) });
    },
    [socket],
  );
  const value = useMemo<RealtimeContextValue>(
    () => ({
      socket,
      status,
      joinDeviceRoom,
      leaveDeviceRoom,
    }),
    [socket, status, joinDeviceRoom, leaveDeviceRoom],
  );
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
export const useSocket = () => useContext(SocketContext)?.socket ?? null;
export const useRealtimeContext = (): RealtimeContextValue => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useRealtimeContext must be used within SocketProvider');
  }
  return context;
};
