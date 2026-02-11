import { DeviceForm } from './device-form';
export const DeviceCreateModal = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  return <DeviceForm open={open} onOpenChange={onOpenChange} />;
};
