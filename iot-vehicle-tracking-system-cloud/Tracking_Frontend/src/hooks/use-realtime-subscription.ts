import { useEffect, useRef } from 'react';
import { useSocket, type RealtimeNamespace } from '@/components/providers/socket-provider';

interface UseRealtimeSubscriptionOptions<TPayload> {
  event: string;
  enabled?: boolean;
  namespace?: RealtimeNamespace;
  handler: (payload: TPayload) => void;
}

export function useRealtimeSubscription<TPayload>({
  event,
  enabled = true,
  namespace = 'dashboard',
  handler,
}: UseRealtimeSubscriptionOptions<TPayload>) {
  const socket = useSocket(namespace);
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
