'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useGeofences } from '@/features/geofences/hooks/use-geofences';
import { hasValidMapCoordinates, MAP_LAYER_CONFIG } from '@/features/map/constants/map-config';
import type { DevicePosition } from '@/features/map/types';
import { useMapStore } from '@/features/map/store/map-store';
import { geofenceServices } from '@/lib/api/geofences';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { GeofenceLayer } from './geofence-layer';
import { DeviceCluster } from './device-cluster';
import { MapControls } from './map-controls';
import { MapGeofenceDraftLayer } from './map-geofence-draft-layer';
import type { MapGeofenceDraft, MapGeofenceRecord } from './map-geofence-types';
import { MapGeofenceWorkspace } from './map-geofence-workspace';
import { MapSelectedDeviceOverlay } from './map-selected-device-overlay';

const DEFAULT_RADIUS_METERS = 500;

const FollowSelectedDevice = ({ device }: { device: DevicePosition | null }) => {
  const map = useMap();
  const followMode = useMapStore((state) => state.followMode);

  useEffect(() => {
    if (!followMode || !device || !hasValidMapCoordinates(device)) {
      return;
    }
    map.flyTo([device.lat, device.lon], Math.max(map.getZoom(), 14), {
      animate: true,
      duration: 0.5,
    });
  }, [device, followMode, map]);

  return null;
};

const RevealSelectedDevice = ({ device }: { device: DevicePosition | null }) => {
  const map = useMap();
  const followMode = useMapStore((state) => state.followMode);
  const previousDeviceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (followMode || !device || !hasValidMapCoordinates(device)) {
      previousDeviceIdRef.current = device?.deviceId ?? null;
      return;
    }
    if (previousDeviceIdRef.current === device.deviceId) {
      return;
    }
    previousDeviceIdRef.current = device.deviceId;
    map.flyTo([device.lat, device.lon], Math.max(map.getZoom(), 14), {
      animate: true,
      duration: 0.55,
    });
  }, [device, followMode, map]);

  return null;
};

const filterDevices = (
  devices: DevicePosition[],
  searchTerm: string,
  statusFilter: 'all' | DevicePosition['status'],
) =>
  devices.filter((device) => {
    const keyword = searchTerm.trim().toLowerCase();
    const matchesSearch =
      keyword.length === 0 ||
      device.deviceName.toLowerCase().includes(keyword) ||
      device.deviceId.toLowerCase().includes(keyword) ||
      (device.vehiclePlate ?? '').toLowerCase().includes(keyword);
    const matchesStatus = statusFilter === 'all' || statusFilter === device.status;
    return matchesSearch && matchesStatus;
  });

const toDraft = (
  geofence: MapGeofenceRecord,
  fallbackCenter: [number, number],
): MapGeofenceDraft => ({
  id: geofence.id,
  source: 'edit',
  name: geofence.name,
  description: geofence.description ?? '',
  centerLatitude: Number(geofence.centerLatitude ?? fallbackCenter[0]),
  centerLongitude: Number(geofence.centerLongitude ?? fallbackCenter[1]),
  radiusMeters: Number(geofence.radiusMeters ?? DEFAULT_RADIUS_METERS),
  triggerOn: geofence.triggerOn ?? 'both',
  isActive: Boolean(geofence.isActive),
  color: geofence.color ?? '#2563eb',
  isPickingCenter: false,
});

const createDraft = (center: [number, number]): MapGeofenceDraft => ({
  id: null,
  source: 'create',
  name: '',
  description: '',
  centerLatitude: center[0],
  centerLongitude: center[1],
  radiusMeters: DEFAULT_RADIUS_METERS,
  triggerOn: 'both',
  isActive: true,
  color: '#2563eb',
  isPickingCenter: false,
});

export const TrackingMap = () => {
  const positions = useMapStore((state) => state.positions);
  const selectedDeviceId = useMapStore((state) => state.selectedDeviceId);
  const setSelectedDevice = useMapStore((state) => state.setSelectedDevice);
  const toggleSelectedDevice = useMapStore((state) => state.toggleSelectedDevice);
  const showGeofences = useMapStore((state) => state.showGeofences);
  const toggleGeofences = useMapStore((state) => state.toggleGeofences);
  const mapLayer = useMapStore((state) => state.mapLayer);
  const mapViewport = useMapStore((state) => state.mapViewport);
  const searchTerm = useMapStore((state) => state.searchTerm);
  const statusFilter = useMapStore((state) => state.statusFilter);
  const [geofenceWorkspaceOpen, setGeofenceWorkspaceOpen] = useState(false);
  const [draft, setDraft] = useState<MapGeofenceDraft | null>(null);
  const queryClient = useQueryClient();

  const devices = useMemo(() => Array.from(positions.values()), [positions]);
  const filteredDevices = useMemo(
    () => filterDevices(devices, searchTerm, statusFilter),
    [devices, searchTerm, statusFilter],
  );
  const selectedDevice = selectedDeviceId ? (positions.get(selectedDeviceId) ?? null) : null;
  const mapDevices = useMemo(
    () => filteredDevices.filter((device) => hasValidMapCoordinates(device)),
    [filteredDevices],
  );

  const geofenceQuery = useGeofences();
  const geofences = useMemo(
    () => ((geofenceQuery.data?.items ?? geofenceQuery.data?.data?.items ?? []) as MapGeofenceRecord[]),
    [geofenceQuery.data],
  );
  const layer = MAP_LAYER_CONFIG[mapLayer];

  const saveGeofenceMutation = useMutation({
    mutationFn: async (payload: MapGeofenceDraft) => {
      const data = {
        name: payload.name.trim(),
        description: payload.description.trim() || undefined,
        geofenceType: 'circle' as const,
        centerLatitude: payload.centerLatitude,
        centerLongitude: payload.centerLongitude,
        radiusMeters: payload.radiusMeters,
        triggerOn: payload.triggerOn,
        color: payload.color,
      };

      if (payload.id) {
        return geofenceServices.update(payload.id, {
          ...data,
          isActive: payload.isActive,
        });
      }

      return geofenceServices.create(data);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['map-geofences'] }),
        queryClient.invalidateQueries({ queryKey: ['geofences'] }),
      ]);
      notificationUtils.success('Đã lưu vùng giám sát');
      setDraft(null);
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Lưu vùng giám sát thất bại',
        getApiErrorMessage(error, 'Không thể lưu geofence bán kính trên bản đồ.'),
      );
    },
  });

  const ensureGeofenceLayerVisible = () => {
    if (!showGeofences) {
      toggleGeofences();
    }
  };

  const openWorkspace = () => {
    ensureGeofenceLayerVisible();
    setGeofenceWorkspaceOpen((value) => !value);
  };

  const resolveSeedCenter = (): [number, number] => {
    if (selectedDevice && hasValidMapCoordinates(selectedDevice)) {
      return [selectedDevice.lat, selectedDevice.lon];
    }
    return mapViewport.center;
  };

  const startCreateDraft = () => {
    ensureGeofenceLayerVisible();
    setGeofenceWorkspaceOpen(true);
    setDraft(createDraft(resolveSeedCenter()));
  };

  const seedDraftFromSelectedDevice = () => {
    const center = resolveSeedCenter();
    ensureGeofenceLayerVisible();
    setGeofenceWorkspaceOpen(true);
    setDraft((current) => ({ ...(current ?? createDraft(center)), centerLatitude: center[0], centerLongitude: center[1] }));
  };

  const editDraft = (geofence: MapGeofenceRecord) => {
    ensureGeofenceLayerVisible();
    setGeofenceWorkspaceOpen(true);
    setDraft(toDraft(geofence, resolveSeedCenter()));
  };

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={mapViewport.center}
        zoom={mapViewport.zoom}
        className="h-full w-full"
        preferCanvas
      >
        <TileLayer attribution={layer.attribution} url={layer.url} />

        <DeviceCluster devices={mapDevices} onSelect={toggleSelectedDevice} />

        {showGeofences
          ? geofences.map((geofence) => <GeofenceLayer key={geofence.id} geofence={geofence} />)
          : null}

        <MapGeofenceDraftLayer
          draft={draft}
          onPickCenter={(latitude, longitude) => {
            setDraft((current) =>
              current
                ? {
                    ...current,
                    centerLatitude: latitude,
                    centerLongitude: longitude,
                    isPickingCenter: false,
                  }
                : current,
            );
          }}
        />

        <MapControls
          devices={mapDevices}
          geofenceWorkspaceOpen={geofenceWorkspaceOpen}
          onToggleGeofenceWorkspace={openWorkspace}
        />
        <RevealSelectedDevice device={selectedDevice} />
        <FollowSelectedDevice device={selectedDevice} />
      </MapContainer>

      <MapGeofenceWorkspace
        open={geofenceWorkspaceOpen}
        geofences={geofences}
        draft={draft}
        selectedDevice={selectedDevice}
        isSaving={saveGeofenceMutation.isPending}
        onClose={() => {
          setGeofenceWorkspaceOpen(false);
          setDraft(null);
        }}
        onStartCreate={startCreateDraft}
        onDraftChange={setDraft}
        onEdit={editDraft}
        onCancelDraft={() => setDraft(null)}
        onSave={() => {
          if (!draft) {
            return;
          }
          saveGeofenceMutation.mutate(draft);
        }}
        onSeedFromSelectedDevice={seedDraftFromSelectedDevice}
      />

      <MapSelectedDeviceOverlay
        device={selectedDevice}
        onClose={() => {
          setSelectedDevice(null);
        }}
      />
    </div>
  );
};
