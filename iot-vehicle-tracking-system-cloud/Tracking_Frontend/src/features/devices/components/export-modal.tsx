'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { exportServices, type ExportJob } from '@/lib/api/export';
import { getApiErrorMessage } from '@/lib/utils/api-error';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId?: string;
}

/**
 * One-device XLSX export, enforced by the backend's live SQL grant.
 * Never interpret a device-level request as full-fleet export.
 */
export const ExportModal = ({ open, onOpenChange, deviceId }: ExportModalProps) => {
  const [job, setJob] = useState<ExportJob | null>(null);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ['device-scoped-export', job?.id],
    queryFn: () => exportServices.getScopedDevice(job!.id),
    enabled: open && job !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'completed' || status === 'failed' ? false : 2500;
    },
  });
  const current = statusQuery.data ?? job;
  const validDeviceId = deviceId && /^[A-Za-z0-9._:-]{1,96}$/.test(deviceId);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setJob(null);
      setError(null);
    }
    onOpenChange(next);
  };

  const create = async () => {
    if (!validDeviceId) return;
    setCreating(true);
    setError(null);
    try {
      setJob(await exportServices.createScopedDevice(deviceId));
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Không thể tạo yêu cầu xuất dữ liệu'));
    } finally {
      setCreating(false);
    }
  };

  const download = async () => {
    if (!current || current.status !== 'completed' || !validDeviceId) return;
    setDownloading(true);
    setError(null);
    try {
      // An authenticated Axios request is required; a direct <a href> does
      // not carry the bearer authorization header.
      const blob = await exportServices.downloadScopedDevice(current.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `device_${deviceId.replace(/[^A-Za-z0-9_.-]/g, '_')}_${current.id}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Không thể tải tệp xuất dữ liệu'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xuất dữ liệu thiết bị</DialogTitle>
          <DialogDescription>
            {validDeviceId
              ? `Tạo tệp Excel (.xlsx) chỉ chứa thông tin của thiết bị ${deviceId}. Quyền truy cập được kiểm tra lại trước khi xuất và tải xuống.`
              : 'Không xác định được thiết bị hợp lệ để xuất dữ liệu.'}
          </DialogDescription>
        </DialogHeader>
        {current ? (
          <p className="text-sm" role="status">
            Trạng thái: {current.status === 'completed' ? 'Đã hoàn tất'
              : current.status === 'processing' ? 'Đang xuất'
                : current.status === 'failed' ? 'Xuất thất bại' : 'Đang chờ'}
          </p>
        ) : null}
        {statusQuery.isError ? (
          <p className="text-sm text-destructive" role="alert">
            Không thể kiểm tra trạng thái. Quyền truy cập có thể đã thay đổi.
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Đóng</Button>
          {current?.status === 'completed' && !statusQuery.isError ? (
            <Button disabled={downloading} onClick={() => void download()}>
              {downloading ? 'Đang tải...' : 'Tải tệp Excel'}
            </Button>
          ) : current === null ? (
            <Button disabled={!validDeviceId || creating} onClick={() => void create()}>
              {creating ? 'Đang tạo...' : 'Tạo tệp Excel'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
