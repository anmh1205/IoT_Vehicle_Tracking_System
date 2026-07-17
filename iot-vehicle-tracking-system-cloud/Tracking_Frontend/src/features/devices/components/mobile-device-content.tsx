import type { Device } from '@/features/devices/types';
import { DeviceGrid } from './device-grid';
export const MobileDeviceContent = ({
  devices,
  onOpen,
}: {
  devices: Device[];
  onOpen: (device: Device) => void;
}) => {
  return (
    <div className="sm:hidden">
      <DeviceGrid devices={devices} onOpen={onOpen} />
    </div>
  );
};
