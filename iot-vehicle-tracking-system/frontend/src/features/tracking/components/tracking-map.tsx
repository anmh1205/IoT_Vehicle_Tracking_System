/**
 * Tracking Map Component - Leaflet map with vehicle markers
 */
'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useVehicles } from '@/hooks/queries/use-vehicles';
import { VehicleMarker } from './vehicle-marker';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Fix for default marker icon in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export function TrackingMap() {
  const { data, isLoading } = useVehicles();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  if (isLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  const vehicles = data?.data || [];

  // Default center (can be adjusted based on vehicle locations)
  const center: [number, number] = [10.762622, 106.660172]; // Ho Chi Minh City

  return (
    <Card className="p-4">
      <div className="h-[600px] w-full rounded-lg overflow-hidden">
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {vehicles.map((vehicle) => {
            if (vehicle.lastLocation) {
              return (
                <VehicleMarker
                  key={vehicle.id}
                  vehicle={vehicle}
                  position={[vehicle.lastLocation.latitude, vehicle.lastLocation.longitude]}
                />
              );
            }
            return null;
          })}
        </MapContainer>
      </div>
    </Card>
  );
}

