'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import dayjs from 'dayjs';

type FirmwareDevice = {
  device_id: string;
  device_name?: string | null;
  current_status?: string | null;
  firmware_version?: string | null;
  target_firmware_version?: string | null;
  firmware_mode?: 'stable' | 'fixed' | null;
  last_seen_at?: string | null;
  request_interval?: number | null;
};

type Mode = 'stable' | 'fixed';

interface FirmwareAssignmentProps {
  devices: FirmwareDevice[];
  firmwareList: Firmware.FirmwareDto[];
  selectedFirmwareByDevice: Record<string, number | null>;
  assigningDevice: string | null;
  devicesLoading: boolean;
  onFirmwareSelect: (deviceId: string, firmwareId: number | null) => void;
  onAssign: (deviceId: string, mode: Mode, firmwareId?: number | null) => Promise<void>;
}

export function FirmwareAssignment({
  devices,
  firmwareList,
  selectedFirmwareByDevice,
  assigningDevice,
  devicesLoading,
  onFirmwareSelect,
  onAssign
}: FirmwareAssignmentProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    deviceId: string | null;
    deviceName: string | null;
    firmwareId: number | null;
    mode: Mode | null;
  }>({
    open: false,
    deviceId: null,
    deviceName: null,
    firmwareId: null,
    mode: null
  });

  const [now, setNow] = useState(dayjs());

  // Update now every second for realtime status calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(dayjs());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Calculate realtime device status based on last_seen_at and request_interval
   * Logic: timeout = (request_interval / 1000) + 10 seconds
   * If elapsed > timeout and status was 'running', mark as 'disconnected'
   */
  const getRealtimeStatus = (device: FirmwareDevice): string | null => {
    const currentStatus = device.current_status ?? null;
    const OFFLINE_BUFFER_SECONDS = 10;
    const intervalMs = device.request_interval ?? 2000; // Default 2 seconds if null
    const intervalSeconds = intervalMs / 1000;
    const timeoutSeconds = intervalSeconds + OFFLINE_BUFFER_SECONDS;

    // If already disconnected or stopped, return as-is
    if (currentStatus === 'disconnected' || currentStatus === 'stopped') {
      return currentStatus;
    }

    // If no last_seen_at and was running, mark as disconnected
    if (!device.last_seen_at) {
      return currentStatus === 'running' ? 'disconnected' : currentStatus;
    }

    const lastSeen = dayjs(device.last_seen_at);
    if (!lastSeen.isValid()) {
      return currentStatus === 'running' ? 'disconnected' : currentStatus;
    }

    const elapsedSeconds = now.diff(lastSeen, 'second');

    // If elapsed > timeout and was running, mark as disconnected
    if (elapsedSeconds > timeoutSeconds && currentStatus === 'running') {
      return 'disconnected';
    }

    return currentStatus;
  };

  // Memoize devices with realtime status
  const devicesWithRealtimeStatus = useMemo(() => {
    return devices.map((d) => ({
      ...d,
      display_status: getRealtimeStatus(d)
    }));
  }, [devices, now]);

  const handleFirmwareSelect = (deviceId: string, firmwareId: number | null, deviceName: string | null) => {
    const mode: Mode = firmwareId === null ? 'stable' : 'fixed';
    const selectedFirmware = firmwareId ? firmwareList.find((fw) => fw.id === firmwareId) : null;
    const stableVersion = firmwareList.find((fw) => (fw as any).is_active || (fw as any).is_stable)?.version ?? null;
    
    // Update local state immediately for UI feedback
    onFirmwareSelect(deviceId, firmwareId);
    
    // Open confirmation dialog
    setConfirmDialog({
      open: true,
      deviceId,
      deviceName,
      firmwareId,
      mode
    });
  };

  const handleConfirmAssign = async () => {
    if (!confirmDialog.deviceId || confirmDialog.mode === null) return;

    try {
      await onAssign(confirmDialog.deviceId, confirmDialog.mode, confirmDialog.firmwareId);
      setConfirmDialog({ open: false, deviceId: null, deviceName: null, firmwareId: null, mode: null });
    } catch (error) {
      // Error handling is done in onAssign function
      console.error('Failed to assign firmware:', error);
      // Keep dialog open on error so user can retry
    }
  };

  const handleCancelAssign = () => {
    // Revert the selection if user cancels
    if (confirmDialog.deviceId) {
      const device = devices.find((d) => d.device_id === confirmDialog.deviceId);
      if (device) {
        const baseSelectedId =
          device.firmware_mode === 'fixed' && device.target_firmware_version
            ? firmwareList.find((fw) => fw.version === device.target_firmware_version)?.id ?? null
            : null;
        onFirmwareSelect(confirmDialog.deviceId, baseSelectedId);
      }
    }
    setConfirmDialog({ open: false, deviceId: null, deviceName: null, firmwareId: null, mode: null });
  };

  const selectedFirmware = confirmDialog.firmwareId
    ? firmwareList.find((fw) => fw.id === confirmDialog.firmwareId)
    : null;
  const stableVersion = firmwareList.find((fw) => (fw as any).is_active || (fw as any).is_stable)?.version ?? null;
  const displayFirmwareVersion = confirmDialog.mode === 'stable' 
    ? (stableVersion ?? 'Stable') 
    : (selectedFirmware?.version ?? '—');

  return (
    <Card className='mt-4'>
      <CardHeader>
        <CardTitle>Danh sách thiết bị & firmware hiện tại</CardTitle>
        <CardDescription>So sánh firmware đang chạy và chế độ cập nhật</CardDescription>
      </CardHeader>
      <CardContent className='p-0'>
        <div className='rounded-lg border overflow-hidden overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-[14%]'>Device ID</TableHead>
                <TableHead className='w-[18%]'>Tên</TableHead>
                <TableHead className='w-[12%]'>Trạng thái</TableHead>
                <TableHead className='w-[14%]'>FW hiện tại</TableHead>
                <TableHead className='w-[14%]'>FW mong muốn</TableHead>
                <TableHead className='w-[12%]'>Chế độ</TableHead>
                <TableHead className='w-[26%] text-right'>Chọn firmware</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className='text-center text-sm text-muted-foreground'>
                    Chưa có dữ liệu thiết bị.
                  </TableCell>
                </TableRow>
              ) : (
                devicesWithRealtimeStatus.map((d) => {
                  const baseSelectedId =
                    d.firmware_mode === 'fixed' && d.target_firmware_version
                      ? firmwareList.find((fw) => fw.version === d.target_firmware_version)?.id ?? null
                      : null;

                  const selectedFirmwareId =
                    selectedFirmwareByDevice[d.device_id] !== undefined
                      ? selectedFirmwareByDevice[d.device_id]
                      : baseSelectedId;

                  const selectedFirmware = selectedFirmwareId
                    ? firmwareList.find((fw) => fw.id === selectedFirmwareId)
                    : null;

                  const displayMode = selectedFirmwareId === null ? 'stable' : 'fixed';

                  const stableVersion = firmwareList.find((fw) => (fw as any).is_active || (fw as any).is_stable)?.version ?? null;
                  const displayTargetVersion =
                    displayMode === 'stable' ? (stableVersion ?? 'Stable') : selectedFirmware?.version ?? d.target_firmware_version ?? '—';
                  return (
                    <TableRow key={d.device_id} className='cursor-pointer hover:bg-muted/50'>
                      <TableCell className='font-medium'>{d.device_id}</TableCell>
                      <TableCell>{d.device_name || '—'}</TableCell>
                      <TableCell className='text-muted-foreground'>{d.display_status || '—'}</TableCell>
                      <TableCell>{d.firmware_version || '—'}</TableCell>
                      <TableCell>{displayTargetVersion}</TableCell>
                      <TableCell>
                        <Badge variant={displayMode === 'stable' ? 'default' : 'outline'}>
                          {displayMode === 'stable' ? 'Stable' : 'Fixed'}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-right'>
                        <Select
                          value={selectedFirmwareId != null ? selectedFirmwareId.toString() : 'stable'}
                          onValueChange={(val) => {
                            const firmwareId = val === 'stable' ? null : Number(val);
                            handleFirmwareSelect(d.device_id, firmwareId, d.device_name ?? null);
                          }}
                          disabled={assigningDevice === d.device_id}
                        >
                          <SelectTrigger className='w-full max-w-[280px] ml-auto' disabled={assigningDevice === d.device_id}>
                            <SelectValue placeholder='Chọn firmware' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='stable'>Stable</SelectItem>
                            {firmwareList.map((fw) => (
                              <SelectItem key={fw.id} value={fw.id.toString()}>
                                {fw.version} — {fw.filename}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => {
        if (!open) {
          handleCancelAssign();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận gán firmware</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn gán firmware cho thiết bị này không?
            </DialogDescription>
          </DialogHeader>
          <div className='py-4 space-y-2'>
            <div className='flex justify-between'>
              <span className='text-sm text-muted-foreground'>Thiết bị:</span>
              <span className='text-sm font-medium'>
                {confirmDialog.deviceName || confirmDialog.deviceId || '—'}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm text-muted-foreground'>Device ID:</span>
              <span className='text-sm font-medium'>{confirmDialog.deviceId || '—'}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm text-muted-foreground'>Chế độ:</span>
              <Badge variant={confirmDialog.mode === 'stable' ? 'default' : 'outline'}>
                {confirmDialog.mode === 'stable' ? 'Stable' : 'Fixed'}
              </Badge>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm text-muted-foreground'>Firmware:</span>
              <span className='text-sm font-medium'>{displayFirmwareVersion}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={handleCancelAssign} disabled={assigningDevice === confirmDialog.deviceId}>
              Hủy
            </Button>
            <Button 
              onClick={handleConfirmAssign} 
              disabled={assigningDevice === confirmDialog.deviceId}
            >
              {assigningDevice === confirmDialog.deviceId ? 'Đang gán...' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

