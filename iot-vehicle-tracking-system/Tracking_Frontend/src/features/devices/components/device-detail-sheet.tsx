'use client';
import type { Device } from '@/features/devices/types';
import { DeviceDetailModalContainer } from './device-detail-modal/modal-container';
export const DeviceDetailSheet = ({
  device,
  open,
  onOpenChange,
}: {
  device: Device | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  return <DeviceDetailModalContainer device={device} open={open} onOpenChange={onOpenChange} />;
};
