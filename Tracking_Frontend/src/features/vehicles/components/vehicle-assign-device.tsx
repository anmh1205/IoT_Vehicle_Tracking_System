'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function VehicleAssignDevice({ open, onOpenChange, devices, currentDeviceId, onAssign }: { open: boolean; onOpenChange: (v: boolean) => void; devices: any[]; currentDeviceId?: string | null; onAssign: (deviceId: string | null) => void }) {
  const [deviceId, setDeviceId] = useState<string>(currentDeviceId ?? 'none');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Gán thiết bị</DialogTitle></DialogHeader>
        <Select value={deviceId} onValueChange={setDeviceId}><SelectTrigger><SelectValue placeholder="Chọn thiết bị" /></SelectTrigger><SelectContent><SelectItem value="none">Bỏ gán</SelectItem>{devices.map((d: any) => <SelectItem key={d.deviceId} value={d.deviceId}>{d.deviceName ?? d.deviceId}</SelectItem>)}</SelectContent></Select>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button onClick={() => onAssign(deviceId === 'none' ? null : deviceId)}>Lưu</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

