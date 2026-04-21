'use client';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateExport } from '@/hooks/mutations/use-create-export';
interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId?: string;
}
export const ExportModal = ({ open, onOpenChange, deviceId }: ExportModalProps) => {
  const [exportType, setExportType] = useState<'devices' | 'alerts' | 'trips'>('devices');
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const mutation = useCreateExport({
    onSuccess: () => onOpenChange(false),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xuất dữ liệu thiết bị</DialogTitle>
          <DialogDescription>
            Chọn loại dữ liệu, định dạng và khoảng thời gian để tạo file xuất cho thiết bị đang xem.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select
            value={exportType}
            onValueChange={(value) => setExportType(value as typeof exportType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="devices">Toàn bộ dữ liệu thiết bị</SelectItem>
              <SelectItem value="alerts">Danh sách cảnh báo</SelectItem>
              <SelectItem value="trips">Lịch sử chuyến đi</SelectItem>
            </SelectContent>
          </Select>
          <Select value={format} onValueChange={(value) => setFormat(value as typeof format)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="device-export-from-date" className="text-xs text-muted-foreground">
                Từ ngày
              </Label>
              <Input
                id="device-export-from-date"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="device-export-to-date" className="text-xs text-muted-foreground">
                Đến ngày
              </Label>
              <Input
                id="device-export-to-date"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate({
                exportType,
                filters: {
                  deviceId,
                  format,
                  from: from || undefined,
                  to: to || undefined,
                },
              })
            }
          >
            Tạo file xuất
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
