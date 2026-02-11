import { DeviceForm } from './device-form';
import type { Device } from '@/features/devices/types';
export const DeviceEditModal = ({
  open,
  onOpenChange,
  device,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device | null;
}) => {
  return <DeviceForm open={open} onOpenChange={onOpenChange} defaultValues={device ?? undefined} />;
};
