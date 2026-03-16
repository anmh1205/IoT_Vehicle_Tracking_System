'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const VehicleAssignDevice = ({
  open,
  onOpenChange,
  devices,
  currentDeviceId,
  onAssign,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  devices: any[];
  currentDeviceId?: string | null;
  onAssign: (deviceId: string | null) => void;
  isPending?: boolean;
}) => {
  const [deviceId, setDeviceId] = useState<string>(currentDeviceId ?? 'none');

  useEffect(() => {
    setDeviceId(currentDeviceId ?? 'none');
  }, [currentDeviceId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gán thiết bị</DialogTitle>
          <DialogDescription>
            Chọn thiết bị telemetry để đồng bộ hành trình, trạng thái và firmware của phương tiện.
          </DialogDescription>
        </DialogHeader>
        <Select value={deviceId} onValueChange={setDeviceId}>
          <SelectTrigger>
            <SelectValue placeholder="Chọn thiết bị" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Bỏ gán thiết bị</SelectItem>
            {devices.map((device: any) => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.deviceName ?? device.deviceId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button disabled={isPending} onClick={() => onAssign(deviceId === 'none' ? null : deviceId)}>
            Lưu gán thiết bị
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
