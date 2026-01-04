'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Vehicle marker icons based on status
const createVehicleIcon = (status: string) => {
    const colors: Record<string, string> = {
        moving: '#22c55e',
        stopped: '#eab308',
        offline: '#6b7280',
        alert: '#ef4444',
    };
    const color = colors[status] || colors.moving;

    return L.divIcon({
        className: 'custom-vehicle-marker',
        html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </div>
    `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
    });
};

export interface VehicleLocation {
    id: number;
    vehicleId: string;
    plateNumber: string;
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    status: 'moving' | 'stopped' | 'offline' | 'alert';
    lastUpdated: string;
    driver?: string;
}

export interface GeofenceData {
    id: number;
    name: string;
    type: 'circle' | 'polygon';
    center?: { lat: number; lng: number };
    radius?: number;
    coordinates?: { lat: number; lng: number }[];
    color?: string;
}

interface MapProps {
    vehicles?: VehicleLocation[];
    geofences?: GeofenceData[];
    selectedVehicle?: number | null;
    onVehicleClick?: (vehicle: VehicleLocation) => void;
    showTrail?: boolean;
    trailData?: { lat: number; lng: number }[];
    center?: [number, number];
    zoom?: number;
}

// Component to fly to selected vehicle
function FlyToVehicle({ vehicle }: { vehicle: VehicleLocation | undefined }) {
    const map = useMap();

    useEffect(() => {
        if (vehicle) {
            map.flyTo([vehicle.latitude, vehicle.longitude], 16, { duration: 1 });
        }
    }, [vehicle, map]);

    return null;
}

export default function VehicleMap({
    vehicles = [],
    geofences = [],
    selectedVehicle,
    onVehicleClick,
    showTrail = false,
    trailData = [],
    center = [10.762622, 106.660172], // Ho Chi Minh City default
    zoom = 12,
}: MapProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className='h-full w-full flex items-center justify-center bg-muted rounded-lg'>
                <div className='text-muted-foreground'>Đang tải bản đồ...</div>
            </div>
        );
    }

    const selectedVehicleData = vehicles.find((v) => v.id === selectedVehicle);

    return (
        <MapContainer
            center={center}
            zoom={zoom}
            className='h-full w-full rounded-lg'
            style={{ minHeight: '400px' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />

            {/* Geofences */}
            {geofences.map((fence) =>
                fence.type === 'circle' && fence.center && fence.radius ? (
                    <Circle
                        key={fence.id}
                        center={[fence.center.lat, fence.center.lng]}
                        radius={fence.radius}
                        pathOptions={{
                            color: fence.color || '#3b82f6',
                            fillColor: fence.color || '#3b82f6',
                            fillOpacity: 0.2,
                        }}
                    >
                        <Popup>
                            <div className='font-semibold'>{fence.name}</div>
                            <div className='text-sm text-gray-500'>Bán kính: {fence.radius}m</div>
                        </Popup>
                    </Circle>
                ) : null
            )}

            {/* Vehicle trail */}
            {showTrail && trailData.length > 1 && (
                <Polyline
                    positions={trailData.map((p) => [p.lat, p.lng])}
                    pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.7 }}
                />
            )}

            {/* Vehicle markers */}
            {vehicles.map((vehicle) => (
                <Marker
                    key={vehicle.id}
                    position={[vehicle.latitude, vehicle.longitude]}
                    icon={createVehicleIcon(vehicle.status)}
                    eventHandlers={{
                        click: () => onVehicleClick?.(vehicle),
                    }}
                >
                    <Popup>
                        <div className='min-w-[200px]'>
                            <div className='font-bold text-base'>{vehicle.plateNumber}</div>
                            <div className='text-sm text-gray-600 mb-2'>
                                {vehicle.driver || 'Chưa có tài xế'}
                            </div>
                            <div className='grid grid-cols-2 gap-2 text-sm'>
                                <div>
                                    <span className='text-gray-500'>Tốc độ:</span>
                                    <span className='ml-1 font-medium'>{vehicle.speed} km/h</span>
                                </div>
                                <div>
                                    <span className='text-gray-500'>Trạng thái:</span>
                                    <span
                                        className={`ml-1 font-medium ${vehicle.status === 'moving'
                                                ? 'text-green-600'
                                                : vehicle.status === 'stopped'
                                                    ? 'text-yellow-600'
                                                    : vehicle.status === 'alert'
                                                        ? 'text-red-600'
                                                        : 'text-gray-600'
                                            }`}
                                    >
                                        {vehicle.status === 'moving'
                                            ? 'Di chuyển'
                                            : vehicle.status === 'stopped'
                                                ? 'Dừng'
                                                : vehicle.status === 'alert'
                                                    ? 'Cảnh báo'
                                                    : 'Offline'}
                                    </span>
                                </div>
                            </div>
                            <div className='text-xs text-gray-400 mt-2'>
                                Cập nhật: {new Date(vehicle.lastUpdated).toLocaleTimeString('vi-VN')}
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {/* Fly to selected vehicle */}
            <FlyToVehicle vehicle={selectedVehicleData} />
        </MapContainer>
    );
}
