import { useEffect, useRef } from 'react';
import { useSocket } from '@/components/providers/socket-provider';

interface UseRealtimeSubscriptionOptions<TPayload> {
  event: string;
  enabled?: boolean;
  namespace?: string;
  handler: (payload: TPayload) => void;
}

export function useRealtimeSubscription<TPayload>({
  event,
  enabled = true,
  handler,
}: UseRealtimeSubscriptionOptions<TPayload>) {
  const socket = useSocket();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket || !enabled) {
      return;
    }

    const listener = (payload: TPayload) => handlerRef.current(payload);
    socket.on(event, listener);

    return () => {
      socket.off(event, listener);
    };
  }, [socket, event, enabled]);
}
