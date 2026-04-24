'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DeviceDetailModalContainer } from '@/features/devices/components/device-detail-modal/modal-container';
import type { Device } from '@/features/devices/types';
import { useGeofences } from '@/features/geofences/hooks/use-geofences';
import { useVehicleAllowedZone } from '@/features/geofences/hooks/use-vehicle-allowed-zone';
import { hasValidMapCoordinates, MAP_LAYER_CONFIG } from '@/features/map/constants/map-config';
import { useMapShortcutTargets } from '@/features/map/hooks/use-map-shortcut-targets';
import {
  fallbackBrowseMode,
  isMapInspectMode,
} from '@/features/map/lib/map-mode';
import { useRoleAccess } from '@/hooks/use-role-access';
import { useMapStore } from '@/features/map/store/map-store';
import type { DevicePosition, MapViewport } from '@/features/map/types';
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
import { MapInspectRail } from './map-inspect-rail';
import { filterDevices } from './map-panel-utils';
import { MapSelectedDeviceOverlay } from './map-selected-device-overlay';

const DEFAULT_RADIUS_METERS = 500;
const VIEWPORT_SYNC_EPSILON = 0.000001;

type AllowedZonePreviewDraft = {
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  isPickingCenter: boolean;
} | null;

type PendingDiscardDialog = {
  description: string;
  onConfirm: () => void;
} | null;

const FollowSelectedDevice = ({
  device,
  enabled,
}: {
  device: DevicePosition | null;
  enabled: boolean;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !device || !hasValidMapCoordinates(device)) {
      return;
    }

    map.flyTo([device.lat, device.lon], Math.max(map.getZoom(), 14), {
      animate: true,
      duration: 0.5,
    });
  }, [device, enabled, map]);

  return null;
};

const RevealSelectedDevice = ({
  device,
  enabled,
}: {
  device: DevicePosition | null;
  enabled: boolean;
}) => {
  const map = useMap();
  const previousDeviceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (enabled || !device || !hasValidMapCoordinates(device)) {
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
  }, [device, enabled, map]);

  return null;
};

const SyncMapViewport = ({ viewport }: { viewport: MapViewport }) => {
  const map = useMap();
  const previousSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    const signature = `${viewport.center[0].toFixed(6)}:${viewport.center[1].toFixed(6)}:${viewport.zoom.toFixed(2)}`;
    if (previousSignatureRef.current === signature) {
      return;
    }

    previousSignatureRef.current = signature;

    const center = map.getCenter();
    const zoom = map.getZoom();
    const alreadySynced =
      Math.abs(center.lat - viewport.center[0]) < VIEWPORT_SYNC_EPSILON &&
      Math.abs(center.lng - viewport.center[1]) < VIEWPORT_SYNC_EPSILON &&
      Math.abs(zoom - viewport.zoom) < VIEWPORT_SYNC_EPSILON;

    if (alreadySynced) {
      return;
    }

    map.setView(viewport.center, viewport.zoom, { animate: false });
  }, [map, viewport]);

  return null;
};

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

const serializeDraft = (draft: MapGeofenceDraft | null) => {
  if (!draft) {
    return null;
  }

  return JSON.stringify({
    ...draft,
    centerLatitude: Number(draft.centerLatitude.toFixed(6)),
    centerLongitude: Number(draft.centerLongitude.toFixed(6)),
    isPickingCenter: false,
  });
};

export const TrackingMap = () => {
  const access = useRoleAccess();
  const queryClient = useQueryClient();
  const positions = useMapStore((state) => state.positions);
  const selectedDeviceId = useMapStore((state) => state.selectedDeviceId);
  const hardMode = useMapStore((state) => state.hardMode);
  const showGeofences = useMapStore((state) => state.showGeofences);
  const followMode = useMapStore((state) => state.followMode);
  const showAllowedZone = useMapStore((state) => state.showAllowedZone);
  const inspectPanelOpen = useMapStore((state) => state.inspectPanelOpen);
  const inspectPanelPayload = useMapStore((state) => state.inspectPanelPayload);
  const inspectPanelRequestKey = useMapStore((state) => state.inspectPanelRequestKey);
  const inspectPanelTarget = useMapStore((state) => state.inspectPanelTarget);
  const inspectRailCollapsed = useMapStore((state) => state.inspectRailCollapsed);
  const mapLayer = useMapStore((state) => state.mapLayer);
  const mapViewport = useMapStore((state) => state.mapViewport);
  const searchTerm = useMapStore((state) => state.searchTerm);
  const statusFilter = useMapStore((state) => state.statusFilter);
  const focusDevice = useMapStore((state) => state.focusDevice);
  const clearSelection = useMapStore((state) => state.clearSelection);
  const closeInspectPanel = useMapStore((state) => state.closeInspectPanel);
  const setHardMode = useMapStore((state) => state.setHardMode);
  const setShowAllowedZone = useMapStore((state) => state.setShowAllowedZone);
  const devices = useMemo(() => Array.from(positions.values()), [positions]);
  const filteredDevices = useMemo(
    () => filterDevices(devices, searchTerm, statusFilter),
    [devices, searchTerm, statusFilter],
  );
  const mapDevices = useMemo(
    () => filteredDevices.filter((device) => hasValidMapCoordinates(device)),
    [filteredDevices],
  );
  const selectedDevice = selectedDeviceId ? positions.get(selectedDeviceId) ?? null : null;
  const selectedDeviceTargets = useMapShortcutTargets(selectedDevice);
  const selectedVehicleId = selectedDevice?.vehicleId ?? null;
  const selectedDeviceAllowedZone = useVehicleAllowedZone(selectedVehicleId).zoneQuery;
  const geofenceQuery = useGeofences();
  const geofences = useMemo(
    () => ((geofenceQuery.data?.items ?? geofenceQuery.data?.data?.items ?? []) as MapGeofenceRecord[]),
    [geofenceQuery.data],
  );
  const layer = MAP_LAYER_CONFIG[mapLayer];
  const [draft, setDraft] = useState<MapGeofenceDraft | null>(null);
  const [draftBaseline, setDraftBaseline] = useState<string | null>(null);
  const [allowedZoneMapPick, setAllowedZoneMapPick] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [allowedZonePreview, setAllowedZonePreview] = useState<AllowedZonePreviewDraft>(null);
  const [allowedZoneDirty, setAllowedZoneDirty] = useState(false);
  const [pendingDiscardDialog, setPendingDiscardDialog] =
    useState<PendingDiscardDialog>(null);

  const isInspectMode = isMapInspectMode(hardMode);
  const isGeofenceEditMode = hardMode === 'edit-geofence';
  const isAllowedZoneEditMode = hardMode === 'edit-allowed-zone';
  const inspectRailVisible = isInspectMode && Boolean(selectedDevice);
  const effectiveFollowMode = Boolean(selectedDeviceId) && isInspectMode && followMode;
  const shouldRenderGeofences = showGeofences || isGeofenceEditMode;
  const canToggleAllowedZone = isInspectMode && Boolean(selectedVehicleId);
  const allowedZoneVisible = Boolean(
    selectedVehicleId &&
      (isAllowedZoneEditMode || (isInspectMode && showAllowedZone)),
  );
  const geofenceDraftDirty = useMemo(
    () => Boolean(draft && draftBaseline && serializeDraft(draft) !== draftBaseline),
    [draft, draftBaseline],
  );
  const hasDirtyEdit =
    (isGeofenceEditMode && geofenceDraftDirty) ||
    (isAllowedZoneEditMode && allowedZoneDirty);
  const selectedDeviceRecord = useMemo<Device | null>(() => {
    if (!selectedDevice || !selectedDeviceTargets.deviceRecordId) {
      return null;
    }

    const normalizedStatus: Device['currentStatus'] =
      selectedDevice.status === 'running' ||
      selectedDevice.status === 'stopped' ||
      selectedDevice.status === 'online'
        ? selectedDevice.status
        : 'disconnected';
    const lastSeenAt =
      typeof selectedDevice.timestamp === 'number' && Number.isFinite(selectedDevice.timestamp)
        ? new Date(selectedDevice.timestamp).toISOString()
        : null;

    return {
      id: selectedDeviceTargets.deviceRecordId,
      deviceId: selectedDevice.deviceId,
      deviceName: selectedDevice.deviceName,
      currentStatus: normalizedStatus,
      ignitionState: selectedDevice.ignitionState,
      motionState: selectedDevice.motionState,
      vehicleState: selectedDevice.vehicleState,
      deviceState: selectedDevice.deviceState,
      sleepMode: selectedDevice.sleepMode,
      stateUpdatedAt: selectedDevice.stateUpdatedAt,
      deviceAlerts: selectedDevice.deviceAlerts,
      ecuAlerts: selectedDevice.ecuAlerts,
      imei: null,
      firmwareVersion: null,
      vehicleId: selectedDevice.vehicleId ?? null,
      vehiclePlate: selectedDevice.vehiclePlate ?? null,
      customerName: selectedDevice.customerName ?? null,
      lastSeenAt,
      latitude: selectedDevice.lat,
      longitude: selectedDevice.lon,
      currentSession: null,
      recentSessions: [],
    };
  }, [selectedDevice, selectedDeviceTargets.deviceRecordId]);
  const inspectControlsOffset = inspectRailVisible
    ? inspectRailCollapsed
      ? '5.5rem'
      : '23.75rem'
    : '0.75rem';

  const clearGeofenceDraft = useCallback(() => {
    setDraft(null);
    setDraftBaseline(null);
  }, []);

  const clearAllowedZoneSession = useCallback(() => {
    setAllowedZoneMapPick(null);
    setAllowedZonePreview(null);
    setAllowedZoneDirty(false);
  }, []);

  const resolveSeedCenter = useCallback((): [number, number] => {
    if (selectedDevice && hasValidMapCoordinates(selectedDevice)) {
      return [selectedDevice.lat, selectedDevice.lon];
    }

    return mapViewport.center;
  }, [mapViewport.center, selectedDevice]);

  const closeCurrentEditMode = useCallback(() => {
    if (isGeofenceEditMode) {
      clearGeofenceDraft();
    }

    if (isAllowedZoneEditMode) {
      clearAllowedZoneSession();
    }

    setHardMode(fallbackBrowseMode(selectedDeviceId));
  }, [
    clearAllowedZoneSession,
    clearGeofenceDraft,
    isAllowedZoneEditMode,
    isGeofenceEditMode,
    selectedDeviceId,
    setHardMode,
  ]);

  const requestDiscardAwareAction = useCallback(
    (action: () => void, description: string) => {
      if (!hasDirtyEdit) {
        action();
        return;
      }

      setPendingDiscardDialog({
        description,
        onConfirm: () => {
          setPendingDiscardDialog(null);
          action();
        },
      });
    },
    [hasDirtyEdit],
  );

  const requestFocusDevice = useCallback(
    (deviceId: string) => {
      requestDiscardAwareAction(
        () => {
          clearGeofenceDraft();
          clearAllowedZoneSession();
          focusDevice(deviceId);
        },
        'Chuyển sang xe khác sẽ đóng chế độ chỉnh sửa hiện tại và bỏ các thay đổi chưa lưu.',
      );
    },
    [clearAllowedZoneSession, clearGeofenceDraft, focusDevice, requestDiscardAwareAction],
  );

  const requestClearSelection = useCallback(() => {
    requestDiscardAwareAction(
      () => {
        clearGeofenceDraft();
        clearAllowedZoneSession();
        clearSelection();
      },
      'Ẩn xe đang chọn sẽ đóng chế độ chỉnh sửa hiện tại và bỏ các thay đổi chưa lưu.',
    );
  }, [
    clearAllowedZoneSession,
    clearGeofenceDraft,
    clearSelection,
    requestDiscardAwareAction,
  ]);

  const requestToggleGeofenceWorkspace = useCallback(() => {
    if (isGeofenceEditMode) {
      requestDiscardAwareAction(
        closeCurrentEditMode,
        'Đóng workspace geofence sẽ bỏ các thay đổi geofence chưa lưu.',
      );
      return;
    }

    requestDiscardAwareAction(
      () => {
        clearAllowedZoneSession();
        setHardMode('edit-geofence');
      },
      'Mở workspace geofence sẽ đóng surface đang chỉnh sửa hiện tại và bỏ các thay đổi chưa lưu.',
    );
  }, [
    clearAllowedZoneSession,
    closeCurrentEditMode,
    isGeofenceEditMode,
    requestDiscardAwareAction,
    setHardMode,
  ]);

  const requestEnterAllowedZoneMode = useCallback(() => {
    if (!selectedVehicleId) {
      return;
    }

    requestDiscardAwareAction(
      () => {
        clearGeofenceDraft();
        setHardMode('edit-allowed-zone');
      },
      'Mở panel vùng cho phép sẽ đóng surface đang chỉnh sửa hiện tại và bỏ các thay đổi chưa lưu.',
    );
  }, [
    clearGeofenceDraft,
    requestDiscardAwareAction,
    selectedVehicleId,
    setHardMode,
  ]);

  const requestExitAllowedZoneMode = useCallback(() => {
    requestDiscardAwareAction(
      closeCurrentEditMode,
      'Đóng panel vùng cho phép sẽ bỏ các thay đổi vùng chưa lưu.',
    );
  }, [closeCurrentEditMode, requestDiscardAwareAction]);

  useEffect(() => {
    if (showAllowedZone && (!selectedDeviceId || !selectedVehicleId)) {
      setShowAllowedZone(false);
    }
  }, [selectedDeviceId, selectedVehicleId, setShowAllowedZone, showAllowedZone]);

  useEffect(() => {
    if (selectedDeviceId || !isInspectMode) {
      return;
    }

    setHardMode('browse');
  }, [isInspectMode, selectedDeviceId, setHardMode]);

  useEffect(() => {
    if (selectedVehicleId || !isAllowedZoneEditMode) {
      return;
    }

    clearAllowedZoneSession();
    setHardMode(fallbackBrowseMode(selectedDeviceId));
  }, [
    clearAllowedZoneSession,
    isAllowedZoneEditMode,
    selectedDeviceId,
    selectedVehicleId,
    setHardMode,
  ]);

  useEffect(() => {
    if (!isAllowedZoneEditMode) {
      clearAllowedZoneSession();
    }
  }, [clearAllowedZoneSession, isAllowedZoneEditMode]);

  useEffect(() => {
    if (!isGeofenceEditMode) {
      clearGeofenceDraft();
    }
  }, [clearGeofenceDraft, isGeofenceEditMode]);

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
      clearGeofenceDraft();
      setHardMode(fallbackBrowseMode(selectedDeviceId));
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
      clearGeofenceDraft();
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Xoá vùng giám sát thất bại',
        getApiErrorMessage(error, 'Không thể xoá geofence trên bản đồ.'),
      );
    },
  });

  const startCreateDraft = () => {
    if (!isGeofenceEditMode) {
      setHardMode('edit-geofence');
    }

    const nextDraft = createDraft(resolveSeedCenter());
    setDraft(nextDraft);
    setDraftBaseline(serializeDraft(nextDraft));
  };

  const seedDraftFromSelectedDevice = () => {
    const center = resolveSeedCenter();
    const nextDraft =
      draft ?? createDraft(center);

    const seededDraft = {
      ...nextDraft,
      centerLatitude: center[0],
      centerLongitude: center[1],
    };

    setDraft(seededDraft);
    setDraftBaseline((current) => current ?? serializeDraft(seededDraft));
  };

  const editDraft = (geofence: MapGeofenceRecord) => {
    const nextDraft = toDraft(geofence, resolveSeedCenter());
    setDraft(nextDraft);
    setDraftBaseline(serializeDraft(nextDraft));
  };

  const handleAllowedZoneVisibility = () => {
    if (!selectedVehicleId) {
      setShowAllowedZone(false);
      return;
    }

    setShowAllowedZone(!showAllowedZone);
  };

  return (
    <>
      <div className="relative h-full w-full">
        <MapContainer
          center={mapViewport.center}
          zoom={mapViewport.zoom}
          className="h-full w-full"
          preferCanvas
        >
          <TileLayer attribution={layer.attribution} url={layer.url} />

          <DeviceCluster devices={mapDevices} onSelect={requestFocusDevice} />

          {shouldRenderGeofences
            ? geofences.map((geofence) => (
                <GeofenceLayer key={geofence.id} geofence={geofence} />
              ))
            : null}

          <MapAllowedZoneLayer
            activeZone={selectedDeviceAllowedZone.data ?? null}
            preview={allowedZonePreview}
            visible={allowedZoneVisible}
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

          <SyncMapViewport viewport={mapViewport} />
          <MapControls
            devices={mapDevices}
            hardMode={hardMode}
            followModeEnabled={effectiveFollowMode}
            allowedZoneVisible={allowedZoneVisible}
            canToggleAllowedZone={canToggleAllowedZone}
            desktopRightOffset={inspectControlsOffset}
            onToggleGeofenceWorkspace={requestToggleGeofenceWorkspace}
            onToggleAllowedZoneVisibility={handleAllowedZoneVisibility}
          />
          <RevealSelectedDevice device={selectedDevice} enabled={effectiveFollowMode} />
          <FollowSelectedDevice device={selectedDevice} enabled={effectiveFollowMode} />
        </MapContainer>

        <MapGeofenceWorkspace
          open={isGeofenceEditMode}
          geofences={geofences}
          draft={draft}
          selectedDevice={selectedDevice}
          isSaving={saveGeofenceMutation.isPending}
          isDeleting={deleteGeofenceMutation.isPending}
          onClose={requestToggleGeofenceWorkspace}
          onStartCreate={startCreateDraft}
          onDraftChange={setDraft}
          onEdit={editDraft}
          onDelete={(geofence) => deleteGeofenceMutation.mutate(geofence.id)}
          onCancelDraft={clearGeofenceDraft}
          onSave={() => {
            if (!draft) {
              return;
            }

            saveGeofenceMutation.mutate(draft);
          }}
          onSeedFromSelectedDevice={seedDraftFromSelectedDevice}
        />

        {isInspectMode ? (
          <MapInspectRail
            device={selectedDevice}
            allowedZone={selectedDeviceAllowedZone.data ?? null}
            allowedZoneLoading={selectedDeviceAllowedZone.isLoading}
            showAllowedZone={allowedZoneVisible}
            canEditAllowedZone={access.canEditDevice && Boolean(selectedVehicleId)}
            onClose={requestClearSelection}
            onCreateAllowedZone={
              selectedVehicleId && access.canEditDevice
                ? requestEnterAllowedZoneMode
                : undefined
            }
            onEditAllowedZone={
              selectedDeviceAllowedZone.data && access.canEditDevice
                ? requestEnterAllowedZoneMode
                : undefined
            }
            onToggleAllowedZoneVisibility={
              selectedVehicleId ? handleAllowedZoneVisibility : undefined
            }
          />
        ) : null}

        {isInspectMode ? (
          <MapSelectedDeviceOverlay
            device={selectedDevice}
            allowedZone={selectedDeviceAllowedZone.data ?? null}
            allowedZoneLoading={selectedDeviceAllowedZone.isLoading}
            showAllowedZone={allowedZoneVisible}
            canEditAllowedZone={access.canEditDevice && Boolean(selectedVehicleId)}
            onClose={requestClearSelection}
            onCreateAllowedZone={
              selectedVehicleId && access.canEditDevice
                ? requestEnterAllowedZoneMode
                : undefined
            }
            onEditAllowedZone={
              selectedDeviceAllowedZone.data && access.canEditDevice
                ? requestEnterAllowedZoneMode
                : undefined
            }
            onToggleAllowedZoneVisibility={
              selectedVehicleId ? handleAllowedZoneVisibility : undefined
            }
          />
        ) : null}

        <DeviceDetailModalContainer
          device={selectedDeviceRecord}
          open={inspectPanelOpen && Boolean(selectedDeviceRecord)}
          onOpenChange={(next) => {
            if (!next) {
              closeInspectPanel();
            }
          }}
          presentation="workspace"
          launchPayload={inspectPanelPayload}
          launchRequestKey={inspectPanelRequestKey}
          launchTarget={inspectPanelTarget}
          fallbackPaths={{
            alertsPath: selectedDeviceTargets.alertsPath,
            deviceDetailPath: selectedDeviceRecord
              ? `/dashboard/fleet/devices/${selectedDeviceRecord.id}`
              : null,
            geofencesPath: '/dashboard/operations/geofences',
            vehicleDetailPath: selectedDeviceTargets.vehicleRecordId
              ? `/dashboard/fleet/vehicles/${selectedDeviceTargets.vehicleRecordId}`
              : null,
          }}
          workspaceActions={{
            onEnterAllowedZoneEdit:
              selectedVehicleId && access.canEditDevice ? requestEnterAllowedZoneMode : undefined,
            onEnterGeofenceEdit: requestToggleGeofenceWorkspace,
          }}
        />

        <MapAllowedZonePanel
          open={isAllowedZoneEditMode}
          vehicleId={selectedVehicleId}
          vehicleLabel={selectedDevice?.vehiclePlate ?? selectedDevice?.deviceName ?? null}
          canEdit={access.canEditDevice && Boolean(selectedVehicleId)}
          mapPickValue={allowedZoneMapPick}
          onClose={requestExitAllowedZoneMode}
          onDirtyChange={setAllowedZoneDirty}
          onPreviewChange={setAllowedZonePreview}
          onSaved={() => {
            clearAllowedZoneSession();
            setShowAllowedZone(true);
            setHardMode(fallbackBrowseMode(selectedDeviceId));
          }}
          onDeleted={() => {
            clearAllowedZoneSession();
            setShowAllowedZone(false);
            setHardMode(fallbackBrowseMode(selectedDeviceId));
          }}
        />
      </div>

      <ConfirmDialog
        open={Boolean(pendingDiscardDialog)}
        title="Bỏ thay đổi chưa lưu?"
        description={
          pendingDiscardDialog?.description ??
          'Các thay đổi trên bản đồ chưa được lưu và sẽ bị huỷ.'
        }
        confirmLabel="Bỏ thay đổi"
        variant="destructive"
        onCancel={() => setPendingDiscardDialog(null)}
        onConfirm={() => pendingDiscardDialog?.onConfirm()}
      />
    </>
  );
};
