'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDeviceDetail } from '../hooks/use-device-detail';
import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { useSendCommand } from '../hooks/use-send-command';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const STATUS_LABELS: Record<string, string> = {
  running: 'Đang chạy',
  stopped: 'Dừng',
  disconnected: 'Mất kết nối',
  active: 'Đang hoạt động',
  pending: 'Đang chờ',
  success: 'Thành công',
  failed: 'Thất bại',
};

export function DeviceDetailSheet({ device, open, onOpenChange }: { device: any; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [command, setCommand] = useState('restart');
  const detail = useDeviceDetail(device?.id ?? null);
  const sessions = useQuery({ queryKey: ['device-sessions', device?.id], queryFn: () => deviceServices.getSessions(device.id), enabled: !!device?.id });
  const telemetry = useQuery({ queryKey: ['device-telemetry', device?.id], queryFn: () => deviceServices.getTelemetry(device.id, { metric: 'vib' }), enabled: !!device?.id });
  const commands = useQuery({ queryKey: ['device-commands', device?.id], queryFn: () => deviceServices.getCommands(device.id), enabled: !!device?.id });
  const errors = useQuery({ queryKey: ['device-errors', device?.id], queryFn: () => deviceServices.getErrors(device.id), enabled: !!device?.id });
  const sendCommand = useSendCommand(device?.id ?? 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{device?.deviceName ?? 'Chi tiết thiết bị'}</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="telemetry">Dữ liệu</TabsTrigger>
            <TabsTrigger value="sessions">Phiên</TabsTrigger>
            <TabsTrigger value="commands">Lệnh</TabsTrigger>
            <TabsTrigger value="errors">Lỗi</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-2 text-sm">
            <div>ID: {detail.data?.deviceId ?? '-'}</div>
            <div>IMEI: {detail.data?.imei ?? '-'}</div>
            <div>Trạng thái: {STATUS_LABELS[detail.data?.currentStatus] ?? detail.data?.currentStatus ?? '-'}</div>
          </TabsContent>

          <TabsContent value="telemetry" className="space-y-2 text-sm">
            {(telemetry.data?.data ?? telemetry.data?.items ?? telemetry.data ?? []).slice(0, 10).map((t: any, idx: number) => (
              <div key={idx} className="rounded border p-2">{t.timestamp ?? '-'}: {String(t.value ?? '-')}</div>
            ))}
          </TabsContent>

          <TabsContent value="sessions" className="space-y-2 text-sm">
            {(sessions.data?.items ?? sessions.data?.data?.items ?? []).slice(0, 10).map((s: any) => (
              <div key={s.id} className="rounded border p-2">#{s.id} - {STATUS_LABELS[s.status] ?? s.status}</div>
            ))}
          </TabsContent>

          <TabsContent value="commands" className="space-y-3 text-sm">
            <div className="flex gap-2">
              <Input value={command} onChange={(e) => setCommand(e.target.value)} />
              <Button onClick={() => sendCommand.mutate({ command })}>Gửi</Button>
            </div>
            {(commands.data?.items ?? commands.data?.data?.items ?? []).slice(0, 10).map((c: any) => (
              <div key={c.id} className="rounded border p-2">{c.command} - {STATUS_LABELS[c.status] ?? c.status}</div>
            ))}
          </TabsContent>

          <TabsContent value="errors" className="space-y-2 text-sm">
            {(errors.data?.items ?? errors.data?.data?.items ?? []).slice(0, 10).map((e: any) => (
              <div key={e.id} className="rounded border p-2">Mã lỗi {e.errorCode} - {e.description}</div>
            ))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}


