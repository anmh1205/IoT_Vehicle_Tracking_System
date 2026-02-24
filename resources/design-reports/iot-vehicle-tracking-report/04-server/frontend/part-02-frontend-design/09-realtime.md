## XIII.9 Realtime Integration

### XIII.9.1 Socket.io Client

```typescript
// src/lib/realtime/client.ts
// Dựa trên Example/frontend_v2/src/lib/realtime/client.ts
// - Namespace support
// - Auto-reconnect
// - Token authentication
// - Connection state management
```

### XIII.9.2 Realtime Hooks

```typescript
// src/hooks/useVehicleRealtime.ts
export function useVehicleRealtime(vehicleId: number) {
  const [location, setLocation] = useState<Location | null>(null);
  const socket = useRealtimeSocket('dashboard');
  
  useEffect(() => {
    socket.on(`vehicle:${vehicleId}:location`, setLocation);
    socket.emit('subscribe', { vehicleId });
    
    return () => {
      socket.off(`vehicle:${vehicleId}:location`);
      socket.emit('unsubscribe', { vehicleId });
    };
  }, [vehicleId, socket]);
  
  return location;
}
```

