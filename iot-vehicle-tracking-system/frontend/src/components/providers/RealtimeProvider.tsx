"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  getRealtimeSocket,
  disconnectRealtimeSocket,
  type NamespaceKey,
} from "@/lib/realtime/client";
import { useAuthStore } from "@/lib/store/authStore";

type ConnectionStatus = "connected" | "connecting" | "disconnected";

interface IRealtimeContext {
  getSocket: (namespace: NamespaceKey) => Socket;
  status: Partial<Record<NamespaceKey, ConnectionStatus>>;
  joinVehicleRoom: (vehicleId: string) => void;
  leaveVehicleRoom: (vehicleId: string) => void;
}

const RealtimeContext = createContext<IRealtimeContext | null>(null);

export default function RealtimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const namespaces = useMemo<NamespaceKey[]>(
    () => ["dashboard", "vehicles", "trips", "alerts", "notifications"],
    []
  );
  const [status, setStatus] = useState<
    Partial<Record<NamespaceKey, ConnectionStatus>>
  >({});
  const tokenRef = useRef<string | null | undefined>(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(
    () => () => {
      disconnectRealtimeSocket();
    },
    []
  );

  useEffect(() => {
    const subscriptions = namespaces.map((namespace) => {
      const socket = getRealtimeSocket(namespace, token ?? null);
      const handleConnect = () => {
        setStatus((prev) => ({ ...prev, [namespace]: "connected" }));
      };
      const handleDisconnect = () => {
        setStatus((prev) => ({ ...prev, [namespace]: "disconnected" }));
      };
      const handleError = () => {
        setStatus((prev) => ({ ...prev, [namespace]: "disconnected" }));
      };

      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);
      socket.on("connect_error", handleError);

      if (!socket.connected) {
        setStatus((prev) => ({ ...prev, [namespace]: "connecting" }));
        socket.connect();
      }

      return { socket, handleConnect, handleDisconnect, handleError };
    });

    return () => {
      subscriptions.forEach(
        ({ socket, handleConnect, handleDisconnect, handleError }) => {
          socket.off("connect", handleConnect);
          socket.off("disconnect", handleDisconnect);
          socket.off("connect_error", handleError);
        }
      );
    };
  }, [namespaces, token]);

  useEffect(() => {
    const socket = getRealtimeSocket("vehicles", token ?? null);

    const handleLocationUpdate = (payload: any) => {
      queryClient.invalidateQueries({
        queryKey: ["vehicles", payload.vehicle_id, "location"],
      });
    };

    socket.on("vehicle.location.updated", handleLocationUpdate);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("vehicle.location.updated", handleLocationUpdate);
    };
  }, [queryClient, token]);

  const getSocket = useCallback(
    (namespace: NamespaceKey) =>
      getRealtimeSocket(namespace, tokenRef.current ?? null),
    []
  );

  const joinVehicleRoom = useCallback(
    (vehicleId: string) => {
      if (!vehicleId) return;
      const socket = getSocket("vehicles");
      socket.emit("vehicle:join", { vehicleId });
    },
    [getSocket]
  );

  const leaveVehicleRoom = useCallback(
    (vehicleId: string) => {
      if (!vehicleId) return;
      const socket = getSocket("vehicles");
      socket.emit("vehicle:leave", { vehicleId });
    },
    [getSocket]
  );

  const value = useMemo<IRealtimeContext>(
    () => ({
      getSocket,
      status,
      joinVehicleRoom,
      leaveVehicleRoom,
    }),
    [getSocket, joinVehicleRoom, leaveVehicleRoom, status]
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export const useRealtimeContext = (): IRealtimeContext => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtimeContext must be used within RealtimeProvider");
  }
  return context;
};

