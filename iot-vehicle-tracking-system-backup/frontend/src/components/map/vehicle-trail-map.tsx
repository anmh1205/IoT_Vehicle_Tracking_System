'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Vehicle icon
const createVehicleIcon = (isSelected: boolean) => {
    const size = isSelected ? 40 : 32;
    const color = isSelected ? '#3b82f6' : '#22c55e';

    return L.divIcon({
        className: 'custom-vehicle-marker',
        html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 10px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      ">
        <svg width="${size / 2}" height="${size / 2}" viewBox="0 0 24 24" fill="white">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </div>
    `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
    });
};

interface TrailPoint {
    lat: number;
    lng: number;
    timestamp: string;
    speed: number;
}

interface VehicleTrailMapProps {
    vehicleId: number;
    plateNumber: string;
    trail: TrailPoint[];
    currentPosition?: { lat: number; lng: number };
}

// Auto-center map component
function AutoCenter({ position }: { position: [number, number] }) {
    const map = useMap();

    useEffect(() => {
        map.setView(position, map.getZoom());
    }, [position, map]);

    return null;
}

export default function VehicleTrailMap({ vehicleId, plateNumber, trail, currentPosition }: VehicleTrailMapProps) {
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

    const center: [number, number] = currentPosition
        ? [currentPosition.lat, currentPosition.lng]
        : trail.length > 0
            ? [trail[trail.length - 1].lat, trail[trail.length - 1].lng]
            : [10.762622, 106.660172];

    const trailPositions = trail.map((p) => [p.lat, p.lng] as [number, number]);

    // Color gradient for trail based on speed
    const getSpeedColor = (speed: number) => {
        if (speed < 20) return '#22c55e'; // green - slow
        if (speed < 50) return '#eab308'; // yellow - medium
        if (speed < 80) return '#f97316'; // orange - fast
        return '#ef4444'; // red - very fast
    };

    return (
        <MapContainer
            center={center}
            zoom={15}
            className='h-full w-full rounded-lg'
            style={{ minHeight: '400px' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />

            {/* Trail line */}
            {trailPositions.length > 1 && (
                <Polyline
                    positions={trailPositions}
                    pathOptions={{
                        color: '#3b82f6',
                        weight: 4,
                        opacity: 0.8,
                    }}
                />
            )}

            {/* Trail points with speed colors */}
            {trail.map((point, idx) => (
                <Marker
                    key={idx}
                    position={[point.lat, point.lng]}
                    icon={L.divIcon({
                        className: 'trail-point',
                        html: `<div style="
              width: 10px;
              height: 10px;
              background: ${getSpeedColor(point.speed)};
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            "></div>`,
                        iconSize: [10, 10],
                        iconAnchor: [5, 5],
                    })}
                >
                    <Popup>
                        <div className='text-sm'>
                            <div className='font-medium'>{new Date(point.timestamp).toLocaleTimeString('vi-VN')}</div>
                            <div className='text-gray-600'>Tốc độ: {point.speed} km/h</div>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {/* Current position marker */}
            {currentPosition && (
                <Marker
                    position={[currentPosition.lat, currentPosition.lng]}
                    icon={createVehicleIcon(true)}
                >
                    <Popup>
                        <div className='font-medium'>{plateNumber}</div>
                        <div className='text-sm text-gray-600'>Vị trí hiện tại</div>
                    </Popup>
                </Marker>
            )}

            {currentPosition && <AutoCenter position={[currentPosition.lat, currentPosition.lng]} />}
        </MapContainer>
    );
}
