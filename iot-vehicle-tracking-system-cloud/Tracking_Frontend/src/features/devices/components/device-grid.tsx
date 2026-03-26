import type { Device } from '@/features/devices/types';
import { DeviceCard } from './device-card';
export const DeviceGrid = ({
  devices,
  onOpen,
}: {
  devices: Device[];
  onOpen: (device: Device) => void;
}) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {devices.map((device) => (
        <DeviceCard key={device.id} device={device} onClick={onOpen} />
      ))}
    </div>
  );
};
