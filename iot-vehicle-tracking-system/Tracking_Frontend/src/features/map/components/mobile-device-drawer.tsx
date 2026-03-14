'use client';
import { useMemo, useState } from 'react';
import { List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMapStore } from '@/features/map/store/map-store';
import type { DevicePosition } from '@/features/map/types';
import { DeviceSearch } from './device-search';
import { DeviceFilterCompact } from './device-filter-compact';
import { DeviceListItem } from './device-list-item';
import { SelectedDeviceCard } from './selected-device-card';
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
export const MobileDeviceDrawer = () => {
  const [open, setOpen] = useState(false);
  const positions = useMapStore((state) => state.positions);
  const selectedDeviceId = useMapStore((state) => state.selectedDeviceId);
  const setSelectedDevice = useMapStore((state) => state.setSelectedDevice);
  const searchTerm = useMapStore((state) => state.searchTerm);
  const setSearchTerm = useMapStore((state) => state.setSearchTerm);
  const statusFilter = useMapStore((state) => state.statusFilter);
  const setStatusFilter = useMapStore((state) => state.setStatusFilter);
  const devices = useMemo(() => Array.from(positions.values()), [positions]);
  const filteredDevices = useMemo(
    () => filterDevices(devices, searchTerm, statusFilter),
    [devices, searchTerm, statusFilter],
  );
  const selectedDevice = selectedDeviceId ? (positions.get(selectedDeviceId) ?? null) : null;
  return (
    <>
      <Button
        size="sm"
        className="absolute left-3 top-3 z-[900] h-11 md:hidden"
        onClick={() => setOpen(true)}
      >
        <List className="mr-2 h-4 w-4" />
        Thiết bị ({filteredDevices.length})
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[72vh] rounded-t-2xl">
          <SheetHeader className="px-0 pb-2">
            <SheetTitle>Thiết bị trên bản đồ</SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <DeviceSearch value={searchTerm} onChange={setSearchTerm} />
              </div>
              <DeviceFilterCompact value={statusFilter} onChange={setStatusFilter} />
            </div>

            <ScrollArea className="h-[42vh]">
              <div className="space-y-2 pr-2">
                {filteredDevices.map((device) => (
                  <DeviceListItem
                    key={device.deviceId}
                    device={device}
                    active={selectedDeviceId === device.deviceId}
                    onClick={() => {
                      setSelectedDevice(device.deviceId);
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
            </ScrollArea>

            <SelectedDeviceCard device={selectedDevice} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
