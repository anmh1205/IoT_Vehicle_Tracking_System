"use client";

import { useEffect } from "react";
import type { NamespaceKey } from "@/lib/realtime/client";
import { useRealtimeContext } from "@/components/providers/RealtimeProvider";

interface IUseRealtimeSubscriptionOptions<TPayload = unknown> {
    namespace: NamespaceKey;
    event: string;
    handler: (payload: TPayload) => void;
    enabled?: boolean;
    autoConnect?: boolean;
}

export const useRealtimeSubscription = <TPayload = unknown>(options: IUseRealtimeSubscriptionOptions<TPayload>): void => {
    const { namespace, event, handler, enabled = true, autoConnect = true } = options;
    const { getSocket } = useRealtimeContext();

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const socket = getSocket(namespace);
        socket.on(event, handler);

        if (autoConnect && !socket.connected) {
            socket.connect();
        }

        return () => {
            socket.off(event, handler);
        };
    }, [autoConnect, enabled, event, getSocket, handler, namespace]);
};


