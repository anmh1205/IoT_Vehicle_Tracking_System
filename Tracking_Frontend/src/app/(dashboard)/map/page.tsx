'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { usePositions } from '@/hooks/usePositions';
import { useGeofences } from '@/hooks/useGeofences';
import { MapSidebar } from '@/components/map/map-sidebar';
import type { DevicePosition } from '@/types/device.types';
import type { Geofence } from '@/types/geofence.types';

const MapContainer = dynamic(() => import('@/components/map/map-container'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <div className="flex flex-col items-center gap-2 text-zinc-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
        <span className="text-sm">Loading map...</span>
      </div>
    </div>
  ),
});

export default function MapPage() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const { data: positions = [], isLoading: isLoadingPositions } = usePositions();
  const { data: geofencesData, isLoading: isLoadingGeofences } = useGeofences();
  const geofences = geofencesData?.items ?? [];

  const handleSelectDevice = useCallback((position: DevicePosition) => {
    setSelectedDeviceId(position.deviceId);
  }, []);

  const handleSelectGeofence = useCallback((_geofence: Geofence) => {
    // Future: fly to geofence bounds
  }, []);

  return (
    <div className="-m-6 flex h-[calc(100vh-4rem)]">
      <MapSidebar
        positions={positions}
        geofences={geofences}
        isLoadingPositions={isLoadingPositions}
        isLoadingGeofences={isLoadingGeofences}
        onSelectDevice={handleSelectDevice}
        onSelectGeofence={handleSelectGeofence}
        selectedDeviceId={selectedDeviceId}
      />
      <div className="flex-1">
        <MapContainer
          positions={positions}
          geofences={geofences}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={handleSelectDevice}
          onSelectGeofence={handleSelectGeofence}
        />
      </div>
    </div>
  );
}
