'use client';
import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMapStore } from '@/features/map/store/map-store';
import type { DevicePosition } from '@/features/map/types';
import { DeviceSearch } from './device-search';
import { DeviceFilter } from './device-filter';
import { DeviceListItem } from './device-list-item';
import { SelectedDeviceCard } from './selected-device-card';
const filterDevices = (
  devices: DevicePosition[],
  searchTerm: string,
  statusFilter: 'all' | DevicePosition['status'],
) => {
  return devices.filter((device) => {
    const matchesSearch =
      searchTerm.trim().length === 0 ||
      device.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.vehiclePlate ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
};
export const DeviceListPanel = () => {
  const positions = useMapStore((state) => state.positions);
  const selectedDeviceId = useMapStore((state) => state.selectedDeviceId);
  const setSelectedDevice = useMapStore((state) => state.setSelectedDevice);
  const searchTerm = useMapStore((state) => state.searchTerm);
  const setSearchTerm = useMapStore((state) => state.setSearchTerm);
  const statusFilter = useMapStore((state) => state.statusFilter);
  const setStatusFilter = useMapStore((state) => state.setStatusFilter);
  const devices = useMemo(
    () => Array.from(positions.values()).sort((a, b) => a.deviceName.localeCompare(b.deviceName)),
    [positions],
  );
  const filteredDevices = useMemo(
    () => filterDevices(devices, searchTerm, statusFilter),
    [devices, searchTerm, statusFilter],
  );
  const selectedDevice = selectedDeviceId ? (positions.get(selectedDeviceId) ?? null) : null;
  return (
    <aside className="flex h-full w-[320px] flex-col gap-3 border-r bg-background p-3">
      <DeviceSearch value={searchTerm} onChange={setSearchTerm} />
      <DeviceFilter value={statusFilter} onChange={setStatusFilter} />

      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="space-y-2 pr-2">
          {filteredDevices.map((device) => (
            <DeviceListItem
              key={device.deviceId}
              device={device}
              active={device.deviceId === selectedDeviceId}
              onClick={() => setSelectedDevice(device.deviceId)}
            />
          ))}
          {filteredDevices.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
Không có thiết bị phù hợp với bộ lọc hiện tại.
            </p>
          ) : null}
        </div>
      </ScrollArea>

      <SelectedDeviceCard device={selectedDevice} />
    </aside>
  );
};
