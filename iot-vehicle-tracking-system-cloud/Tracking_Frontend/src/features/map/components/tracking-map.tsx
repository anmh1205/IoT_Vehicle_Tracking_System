'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DeviceDetailModalContainer } from '@/features/devices/components/device-detail-modal/modal-container';
import type { Device } from '@/features/devices/types';
import { useVehicleAllowedZone } from '@/features/geofences/hooks/use-vehicle-allowed-zone';
import { hasValidMapCoordinates, MAP_LAYER_CONFIG } from '@/features/map/constants/map-config';
import { useMapShortcutTargets } from '@/features/map/hooks/use-map-shortcut-targets';
import { fallbackBrowseMode, isMapInspectMode } from '@/features/map/lib/map-mode';
import { useRoleAccess } from '@/hooks/use-role-access';
import { useMapStore } from '@/features/map/store/map-store';
import type { DevicePosition, MapViewport } from '@/features/map/types';
import { DeviceCluster } from './device-cluster';
import { MapAllowedZoneLayer, type ZonePreviewDraft } from './map-allowed-zone-layer';
import { MapAllowedZonePanel } from './map-allowed-zone-panel';
import { MapControls } from './map-controls';
import { MapInspectRail } from './map-inspect-rail';
import { filterDevices } from './map-panel-utils';
import { MapSelectedDeviceOverlay } from './map-selected-device-overlay';

const VIEWPORT_SYNC_EPSILON = 0.000001;
const FOLLOW_MIN_MOVE_METERS = 8;
const FOLLOW_CENTER_EPSILON_METERS = 4;

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
  const deviceId = device?.deviceId ?? null;
  const deviceLat = device?.lat ?? Number.NaN;
  const deviceLon = device?.lon ?? Number.NaN;
  const hasValidDevicePosition = device ? hasValidMapCoordinates(device) : false;
  const lastFollowedRef = useRef<{
    deviceId: string;
    lat: number;
    lon: number;
  } | null>(null);

  useEffect(() => {
    if (!enabled || !deviceId || !hasValidDevicePosition) {
      lastFollowedRef.current = null;
      return;
    }

    const currentZoom = map.getZoom();
    const target = [deviceLat, deviceLon] as [number, number];
    const lastFollowed = lastFollowedRef.current;
    const isSameDevice = lastFollowed?.deviceId === deviceId;
    const movedSinceLastFollow =
      !lastFollowed ||
      !isSameDevice ||
      map.distance([lastFollowed.lat, lastFollowed.lon], target) >= FOLLOW_MIN_MOVE_METERS;
    const centerDistance = map.distance(map.getCenter(), target);
    const needsInitialZoom = currentZoom < 14;

    if (
      isSameDevice &&
      !movedSinceLastFollow &&
      !needsInitialZoom &&
      centerDistance < FOLLOW_CENTER_EPSILON_METERS
    ) {
      return;
    }

    map.stop();

    if (!isSameDevice || needsInitialZoom) {
      map.flyTo(target, Math.max(currentZoom, 14), {
        animate: true,
        duration: 0.45,
      });
    } else {
      map.panTo(target, {
        animate: true,
        duration: 0.25,
      });
    }

    lastFollowedRef.current = {
      deviceId,
      lat: deviceLat,
      lon: deviceLon,
    };
  }, [deviceId, deviceLat, deviceLon, enabled, hasValidDevicePosition, map]);

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
  const deviceId = device?.deviceId ?? null;
  const deviceLat = device?.lat ?? Number.NaN;
  const deviceLon = device?.lon ?? Number.NaN;
  const hasValidDevicePosition = device ? hasValidMapCoordinates(device) : false;
  const previousDeviceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (enabled || !deviceId || !hasValidDevicePosition) {
      previousDeviceIdRef.current = deviceId;
      return;
    }

    if (previousDeviceIdRef.current === deviceId) {
      return;
    }

    previousDeviceIdRef.current = deviceId;
    map.flyTo([deviceLat, deviceLon], Math.max(map.getZoom(), 14), {
      animate: true,
      duration: 0.55,
    });
  }, [deviceId, deviceLat, deviceLon, enabled, hasValidDevicePosition, map]);

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

export const TrackingMap = () => {
  const access = useRoleAccess();
  const positions = useMapStore((state) => state.positions);
  const selectedDeviceId = useMapStore((state) => state.selectedDeviceId);
  const hardMode = useMapStore((state) => state.hardMode);
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

  const layer = MAP_LAYER_CONFIG[mapLayer];
  const [allowedZoneMapPick, setAllowedZoneMapPick] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [allowedZonePreview, setAllowedZonePreview] = useState<ZonePreviewDraft>(null);
  const [allowedZoneDirty, setAllowedZoneDirty] = useState(false);
  const [pendingDiscardDialog, setPendingDiscardDialog] =
    useState<PendingDiscardDialog>(null);

  const isInspectMode = isMapInspectMode(hardMode);
  const isZoneEditMode = hardMode === 'edit-zone';
  const inspectRailVisible = isInspectMode && Boolean(selectedDevice);
  const effectiveFollowMode = Boolean(selectedDeviceId) && isInspectMode && followMode;
  const canToggleAllowedZone = isInspectMode && Boolean(selectedVehicleId);
  const allowedZoneVisible = Boolean(
    selectedVehicleId && (isZoneEditMode || (isInspectMode && showAllowedZone)),
  );
  const hasDirtyEdit = isZoneEditMode && allowedZoneDirty;

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

  const clearAllowedZoneSession = useCallback(() => {
    setAllowedZoneMapPick(null);
    setAllowedZonePreview(null);
    setAllowedZoneDirty(false);
  }, []);

  const closeCurrentEditMode = useCallback(() => {
    clearAllowedZoneSession();
    setHardMode(fallbackBrowseMode(selectedDeviceId));
  }, [clearAllowedZoneSession, selectedDeviceId, setHardMode]);

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
          clearAllowedZoneSession();
          focusDevice(deviceId);
        },
        'Chuyển sang xe khác sẽ đóng chế độ chỉnh sửa hiện tại và bỏ các thay đổi chưa lưu.',
      );
    },
    [clearAllowedZoneSession, focusDevice, requestDiscardAwareAction],
  );

  const requestClearSelection = useCallback(() => {
    requestDiscardAwareAction(
      () => {
        clearAllowedZoneSession();
        clearSelection();
      },
      'Ẩn xe đang chọn sẽ đóng chế độ chỉnh sửa hiện tại và bỏ các thay đổi chưa lưu.',
    );
  }, [clearAllowedZoneSession, clearSelection, requestDiscardAwareAction]);

  const requestEnterAllowedZoneMode = useCallback(() => {
    if (!selectedVehicleId) {
      return;
    }

    requestDiscardAwareAction(
      () => {
        clearAllowedZoneSession();
        setHardMode('edit-zone');
      },
      'Mở editor vùng sẽ đóng surface đang chỉnh sửa hiện tại và bỏ các thay đổi chưa lưu.',
    );
  }, [clearAllowedZoneSession, requestDiscardAwareAction, selectedVehicleId, setHardMode]);

  const requestExitAllowedZoneMode = useCallback(() => {
    requestDiscardAwareAction(
      closeCurrentEditMode,
      'Đóng editor vùng sẽ bỏ các thay đổi vùng chưa lưu.',
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
    if (selectedVehicleId || !isZoneEditMode) {
      return;
    }

    clearAllowedZoneSession();
    setHardMode(fallbackBrowseMode(selectedDeviceId));
  }, [clearAllowedZoneSession, isZoneEditMode, selectedDeviceId, selectedVehicleId, setHardMode]);

  useEffect(() => {
    if (!isZoneEditMode) {
      clearAllowedZoneSession();
    }
  }, [clearAllowedZoneSession, isZoneEditMode]);

  const handleAllowedZoneVisibility = useCallback(() => {
    if (!selectedVehicleId) {
      setShowAllowedZone(false);
      return;
    }

    setShowAllowedZone(!showAllowedZone);
  }, [selectedVehicleId, setShowAllowedZone, showAllowedZone]);

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

          <MapAllowedZoneLayer
            activeZone={selectedDeviceAllowedZone.data ?? null}
            preview={allowedZonePreview}
            visible={allowedZoneVisible}
            onPickCenter={(latitude, longitude) => {
              if (!(allowedZonePreview?.zoneType === 'circle' && allowedZonePreview.isPickingCenter)) {
                return;
              }

              setAllowedZoneMapPick({ latitude, longitude });
              setAllowedZonePreview((current) =>
                current?.zoneType === 'circle'
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
            onToggleGeofenceWorkspace={requestEnterAllowedZoneMode}
            onToggleAllowedZoneVisibility={handleAllowedZoneVisibility}
          />

          <RevealSelectedDevice device={selectedDevice} enabled={effectiveFollowMode} />
          <FollowSelectedDevice device={selectedDevice} enabled={effectiveFollowMode} />
        </MapContainer>

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
            geofencesPath: '/dashboard/zones',
            vehicleDetailPath: selectedDeviceTargets.vehicleRecordId
              ? `/dashboard/fleet/vehicles/${selectedDeviceTargets.vehicleRecordId}`
              : null,
          }}
          workspaceActions={{
            onEnterAllowedZoneEdit:
              selectedVehicleId && access.canEditDevice ? requestEnterAllowedZoneMode : undefined,
          }}
        />

        <MapAllowedZonePanel
          open={isZoneEditMode}
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
