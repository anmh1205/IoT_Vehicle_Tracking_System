import { DeviceForm } from './device-form';
export const DeviceCreateModal = ({
  open,
  onOpenChange,
  onCreateSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSuccess?: () => void;
}) => {
  return <DeviceForm open={open} onOpenChange={onOpenChange} onCreateSuccess={onCreateSuccess} />;
};
