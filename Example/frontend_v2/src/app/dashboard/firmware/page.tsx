'use client';

import { useEffect, useMemo, useState } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirmwareList } from '@/hooks/queries/useFirmwareList';
import { useFirmwareAssignments } from '@/hooks/queries/useFirmwareAssignments';
import { useFirmwareLogs } from '@/hooks/queries/useFirmwareLogs';
import { firmwareServices } from '@/lib/api/firmware';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import type { FirmwareAssignmentEventPayload } from '@/lib/realtime/events';
import { notificationUtils } from '@/lib/notification';
import { FirmwareStats } from './components/FirmwareStats';
import { FirmwareList } from './components/FirmwareList';
import { FirmwareAssignment } from './components/FirmwareAssignment';
import { FirmwareAssignmentsLog } from './components/FirmwareAssignmentsLog';

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

export default function FirmwarePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [devices, setDevices] = useState<FirmwareDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [selectedFirmwareByDevice, setSelectedFirmwareByDevice] = useState<Record<string, number | null>>({});
  const [assigningDevice, setAssigningDevice] = useState<string | null>(null);

  const { data: firmwareList = [], isLoading: listLoading, error: listError } = useFirmwareList(true);
  const { data: assignmentsData, isLoading: assignLoading } = useFirmwareAssignments({ page: 1, pageSize: 10 }, true);
  const { data: logsData, isLoading: logsLoading } = useFirmwareLogs({ page: 1, pageSize: 10 }, true);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        setDevicesLoading(true);
        const deviceList = await firmwareServices.devices();
        setDevices(deviceList || []);
      } catch (e) {
        console.error('Không thể tải danh sách thiết bị firmware', e);
        notificationUtils.error('Lỗi tải thiết bị', 'Không thể lấy danh sách thiết bị firmware');
      } finally {
        setDevicesLoading(false);
      }
    };
    loadDevices();
  }, []);

  const handleUpload = async (file: File, firmwareName?: string, version?: string) => {
    await firmwareServices.upload(file, firmwareName, version);
    queryClient.invalidateQueries({ queryKey: ['firmware', 'list'] });
  };

  const handleActivate = async (version: string) => {
    await firmwareServices.activate(version);
    queryClient.invalidateQueries({ queryKey: ['firmware', 'list'] });
  };

  const handleDelete = async (version: string) => {
    await firmwareServices.delete(version);
    queryClient.invalidateQueries({ queryKey: ['firmware', 'list'] });
  };

  const handleFirmwareSelect = (deviceId: string, firmwareId: number | null) => {
    setSelectedFirmwareByDevice((prev) => ({
      ...prev,
      [deviceId]: firmwareId
    }));
  };

  const handleAssign = async (deviceId: string, mode: Mode, firmwareId?: number | null) => {
    // Use provided firmwareId or fallback to state
    const fwId = firmwareId !== undefined ? firmwareId : selectedFirmwareByDevice[deviceId];
    const selected = fwId != null ? firmwareList.find((fw) => fw.id === fwId) : undefined;
    const stableVersion = firmwareList.find((fw) => (fw as any).is_active || (fw as any).is_stable)?.version ?? null;
    const selectedVersion = mode === 'stable' ? stableVersion : selected?.version ?? null;
    if (mode === 'stable' && !stableVersion) {
      notificationUtils.error('Chưa có firmware stable', 'Hãy đặt một bản stable trước khi gán chế độ Stable');
      return;
    }
    if (mode === 'fixed' && !selectedVersion) {
      notificationUtils.error('Chưa chọn firmware', 'Vui lòng chọn firmware để gán');
      return;
    }

    setAssigningDevice(deviceId);
    try {
      await firmwareServices.assign(deviceId, selectedVersion, mode);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['firmware', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['firmware', 'assignments'] }),
        queryClient.invalidateQueries({ queryKey: ['firmware', 'logs'] })
      ]);
      const deviceList = await firmwareServices.devices();
      setDevices(deviceList || []);
      setSelectedFirmwareByDevice((prev) => ({ ...prev, [deviceId]: mode === 'stable' ? null : fwId ?? null }));
      notificationUtils.success('Đã gán firmware', `Thiết bị ${deviceId} đã được gán ${mode === 'stable' ? 'Stable' : selectedVersion}`);
    } finally {
      setAssigningDevice(null);
    }
  };

  useRealtimeSubscription<FirmwareAssignmentEventPayload>({
    namespace: 'firmware',
    event: 'firmware.assignment.updated',
    enabled: true,
    handler: () => {
      queryClient.invalidateQueries({ queryKey: ['firmware', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['firmware', 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['firmware', 'logs'] });
      firmwareServices.devices().then((deviceList) => setDevices(deviceList || [])).catch(() => undefined);
    }
  });

  return (
    <PageContainer pageTitle='Firmware' pageDescription='Quản lý firmware, tải lên và gán thiết bị' scrollable>
      <FirmwareStats firmwareList={firmwareList} />

      <FirmwareList
        firmwareList={firmwareList}
        loading={listLoading}
        error={listError as Error | null}
        search={search}
        onSearch={setSearch}
        onUpload={handleUpload}
        onActivate={handleActivate}
        onDelete={handleDelete}
      />

      <FirmwareAssignment
        devices={devices}
        firmwareList={firmwareList}
        selectedFirmwareByDevice={selectedFirmwareByDevice}
        assigningDevice={assigningDevice}
        devicesLoading={devicesLoading}
        onFirmwareSelect={handleFirmwareSelect}
        onAssign={handleAssign}
      />

      <FirmwareAssignmentsLog
        assignments={assignmentsData?.items || []}
        logs={logsData?.items || []}
        assignmentsLoading={assignLoading}
        logsLoading={logsLoading}
      />
    </PageContainer>
  );
}
