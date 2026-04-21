'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useGeofences } from '@/features/geofences/hooks/use-geofences';
import { useVehicleAllowedZone } from '@/features/geofences/hooks/use-vehicle-allowed-zone';
import { useRoleAccess } from '@/hooks/use-role-access';
import { hasValidMapCoordinates, MAP_LAYER_CONFIG } from '@/features/map/constants/map-config';
import { useMapStore } from '@/features/map/store/map-store';
import type { DevicePosition } from '@/features/map/types';
import { geofenceServices } from '@/lib/api/geofences';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { DeviceCluster } from './device-cluster';
import { GeofenceLayer } from './geofence-layer';
import { MapAllowedZoneLayer } from './map-allowed-zone-layer';
import { MapAllowedZonePanel } from './map-allowed-zone-panel';
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

type AllowedZonePreviewDraft = {
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  isPickingCenter: boolean;
} | null;

const clearAllowedZoneSession = (
  setPanelOpen: (value: boolean) => void,
  setMapPick: (value: { latitude: number; longitude: number } | null) => void,
  setPreview: (value: AllowedZonePreviewDraft) => void,
) => {
  setPanelOpen(false);
  setMapPick(null);
  setPreview(null);
};

export const TrackingMap = () => {
  const access = useRoleAccess();
  const positions = useMapStore((state) => state.positions);
  const selectedDeviceId = useMapStore((state) => state.selectedDeviceId);
  const setSelectedDevice = useMapStore((state) => state.setSelectedDevice);
  const toggleSelectedDevice = useMapStore((state) => state.toggleSelectedDevice);
  const showGeofences = useMapStore((state) => state.showGeofences);
  const toggleGeofences = useMapStore((state) => state.toggleGeofences);
  const followMode = useMapStore((state) => state.followMode);
  const mapLayer = useMapStore((state) => state.mapLayer);
  const mapViewport = useMapStore((state) => state.mapViewport);
  const searchTerm = useMapStore((state) => state.searchTerm);
  const statusFilter = useMapStore((state) => state.statusFilter);
  const [geofenceWorkspaceOpen, setGeofenceWorkspaceOpen] = useState(false);
  const [workspaceOwnsGeofenceLayer, setWorkspaceOwnsGeofenceLayer] = useState(false);
  const [draft, setDraft] = useState<MapGeofenceDraft | null>(null);
  const [allowedZonePanelOpen, setAllowedZonePanelOpen] = useState(false);
  const [viewedAllowedZoneVehicleId, setViewedAllowedZoneVehicleId] = useState<string | null>(null);
  const [showViewedAllowedZone, setShowViewedAllowedZone] = useState(false);
  const [allowedZoneMapPick, setAllowedZoneMapPick] = useState<{ latitude: number; longitude: number } | null>(null);
  const [allowedZonePreview, setAllowedZonePreview] = useState<AllowedZonePreviewDraft>(null);
  const queryClient = useQueryClient();

  const devices = useMemo(() => Array.from(positions.values()), [positions]);
  const filteredDevices = useMemo(
    () => filterDevices(devices, searchTerm, statusFilter),
    [devices, searchTerm, statusFilter],
  );
  const selectedDevice = selectedDeviceId ? positions.get(selectedDeviceId) ?? null : null;
  const selectedVehicleId = selectedDevice?.vehicleId ?? null;
  const selectedDeviceAllowedZone = useVehicleAllowedZone(selectedVehicleId).zoneQuery;
  const viewedAllowedZone = useVehicleAllowedZone(viewedAllowedZoneVehicleId).zoneQuery;
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

  const hideWorkspaceGeofenceLayer = () => {
    if (workspaceOwnsGeofenceLayer && showGeofences) {
      toggleGeofences();
    }
    setWorkspaceOwnsGeofenceLayer(false);
  };

  const closeGeofenceWorkspace = () => {
    setGeofenceWorkspaceOpen(false);
    setDraft(null);
    hideWorkspaceGeofenceLayer();
  };

  useEffect(() => {
    clearAllowedZoneSession(
      setAllowedZonePanelOpen,
      setAllowedZoneMapPick,
      setAllowedZonePreview,
    );
    closeGeofenceWorkspace();
    setShowViewedAllowedZone(false);
    if (!selectedVehicleId) {
      setViewedAllowedZoneVehicleId(null);
      return;
    }

    setViewedAllowedZoneVehicleId(selectedVehicleId);
  }, [selectedDeviceId, selectedVehicleId]);

  useEffect(() => {
    if (
      selectedVehicleId &&
      viewedAllowedZoneVehicleId === selectedVehicleId &&
      selectedDeviceAllowedZone.data
    ) {
      setViewedAllowedZoneVehicleId(selectedVehicleId);
      setShowViewedAllowedZone(true);
    }
  }, [selectedDeviceAllowedZone.data, selectedVehicleId, viewedAllowedZoneVehicleId]);

  useEffect(() => {
    if (viewedAllowedZone.isFetched && !viewedAllowedZone.data && !allowedZonePreview) {
      setShowViewedAllowedZone(false);
      setViewedAllowedZoneVehicleId((current) =>
        current === viewedAllowedZoneVehicleId ? null : current,
      );
    }
  }, [allowedZonePreview, viewedAllowedZone.data, viewedAllowedZone.isFetched, viewedAllowedZoneVehicleId]);

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

  const deleteGeofenceMutation = useMutation({
    mutationFn: (geofenceId: number) => geofenceServices.delete(geofenceId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['map-geofences'] }),
        queryClient.invalidateQueries({ queryKey: ['geofences'] }),
      ]);
      notificationUtils.success('Đã xoá vùng giám sát');
      setDraft(null);
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Xoá vùng giám sát thất bại',
        getApiErrorMessage(error, 'Không thể xoá geofence trên bản đồ.'),
      );
    },
  });

  const ensureGeofenceLayerVisible = () => {
    if (!showGeofences) {
      setWorkspaceOwnsGeofenceLayer(true);
      toggleGeofences();
      return;
    }

    setWorkspaceOwnsGeofenceLayer(false);
  };

  const openWorkspace = () => {
    if (allowedZonePanelOpen) {
      return;
    }
    if (geofenceWorkspaceOpen) {
      closeGeofenceWorkspace();
      return;
    }
    ensureGeofenceLayerVisible();
    setGeofenceWorkspaceOpen(true);
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

  const openAllowedZonePanel = () => {
    if (!selectedVehicleId) {
      return;
    }
    setAllowedZoneMapPick(null);
    setAllowedZonePreview(null);
    setAllowedZonePanelOpen(true);
  };

  const closeAllowedZonePanel = () => {
    setAllowedZonePanelOpen(false);
    setAllowedZoneMapPick(null);
    setAllowedZonePreview(null);
  };

  const toggleAllowedZoneVisibility = () => {
    if (!selectedVehicleId) {
      setShowViewedAllowedZone(false);
      setViewedAllowedZoneVehicleId(null);
      return;
    }

    setViewedAllowedZoneVehicleId(selectedVehicleId);
    setShowViewedAllowedZone((current) =>
      viewedAllowedZoneVehicleId === selectedVehicleId ? !current : true,
    );
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

        <MapAllowedZoneLayer
          activeZone={viewedAllowedZone.data ?? null}
          preview={allowedZonePreview}
          visible={showViewedAllowedZone}
          onPickCenter={(latitude, longitude) => {
            if (!allowedZonePreview?.isPickingCenter) {
              return;
            }

            setAllowedZoneMapPick({ latitude, longitude });
            setAllowedZonePreview((current) =>
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
          geofenceWorkspaceDisabled={allowedZonePanelOpen}
          followModeEnabled={Boolean(selectedDeviceId) && followMode}
          allowedZoneVisible={
            showViewedAllowedZone &&
            viewedAllowedZoneVehicleId === selectedVehicleId &&
            Boolean(viewedAllowedZone.data ?? allowedZonePreview)
          }
          onToggleGeofenceWorkspace={openWorkspace}
          onToggleAllowedZoneVisibility={toggleAllowedZoneVisibility}
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
          closeGeofenceWorkspace();
        }}
        onStartCreate={startCreateDraft}
        onDraftChange={setDraft}
        onEdit={editDraft}
        onDelete={(geofence) => deleteGeofenceMutation.mutate(geofence.id)}
        onCancelDraft={() => setDraft(null)}
        onSave={() => {
          if (!draft) {
            return;
          }
          saveGeofenceMutation.mutate(draft);
        }}
        isDeleting={deleteGeofenceMutation.isPending}
        onSeedFromSelectedDevice={seedDraftFromSelectedDevice}
      />

      {!geofenceWorkspaceOpen && !allowedZonePanelOpen ? (
        <MapSelectedDeviceOverlay
          device={selectedDevice}
          allowedZone={selectedDeviceAllowedZone.data ?? null}
          allowedZoneLoading={selectedDeviceAllowedZone.isLoading}
          showAllowedZone={showViewedAllowedZone && viewedAllowedZoneVehicleId === selectedVehicleId}
          canEditAllowedZone={access.canEditDevice && Boolean(selectedVehicleId)}
          onClose={() => {
            setSelectedDevice(null);
          }}
          onCreateAllowedZone={selectedVehicleId && access.canEditDevice ? openAllowedZonePanel : undefined}
          onEditAllowedZone={selectedDeviceAllowedZone.data && access.canEditDevice ? openAllowedZonePanel : undefined}
          onToggleAllowedZoneVisibility={
            selectedVehicleId ? toggleAllowedZoneVisibility : undefined
          }
        />
      ) : null}

      <MapAllowedZonePanel
        open={allowedZonePanelOpen}
        vehicleId={selectedVehicleId}
        vehicleLabel={selectedDevice?.vehiclePlate ?? selectedDevice?.deviceName ?? null}
        canEdit={access.canEditDevice && Boolean(selectedVehicleId)}
        mapPickValue={allowedZoneMapPick}
        onClose={closeAllowedZonePanel}
        onPreviewChange={setAllowedZonePreview}
        onSaved={() => {
          closeAllowedZonePanel();
          if (selectedVehicleId) {
            setViewedAllowedZoneVehicleId(selectedVehicleId);
          }
          setShowViewedAllowedZone(true);
        }}
        onDeleted={() => {
          closeAllowedZonePanel();
          setShowViewedAllowedZone(false);
          if (selectedVehicleId && viewedAllowedZoneVehicleId === selectedVehicleId) {
            setViewedAllowedZoneVehicleId(null);
          }
        }}
      />
    </div>
  );
};
