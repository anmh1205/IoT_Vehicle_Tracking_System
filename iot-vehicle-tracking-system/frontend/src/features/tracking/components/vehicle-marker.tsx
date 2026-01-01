/**
 * Vehicle Marker Component - Custom marker for vehicles on map
 */
'use client';

import { Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import type { Vehicle } from '@/types';
import { Car } from 'lucide-react';

interface VehicleMarkerProps {
  vehicle: Vehicle;
  position: [number, number];
}

const vehicleIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export function VehicleMarker({ vehicle, position }: VehicleMarkerProps) {
  return (
    <Marker position={position} icon={vehicleIcon}>
      <Popup>
        <div className="space-y-1">
          <div className="font-semibold">{vehicle.vehicleId}</div>
          <div className="text-sm text-muted-foreground">{vehicle.plateNumber}</div>
          {vehicle.brand && vehicle.model && (
            <div className="text-sm">{vehicle.brand} {vehicle.model}</div>
          )}
          {vehicle.lastLocation?.speed && (
            <div className="text-sm">Speed: {vehicle.lastLocation.speed} km/h</div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

