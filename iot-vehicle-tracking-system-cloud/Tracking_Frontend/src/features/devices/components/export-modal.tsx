'use client';

import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId?: string;
}

/**
 * The server currently supports administrator-only, unfiltered fleet Excel
 * exports. Never turn a request for one device into a full-fleet data export.
 */
export const ExportModal = ({ open, onOpenChange, deviceId }: ExportModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Xuất dữ liệu thiết bị</DialogTitle>
        <DialogDescription>
          {deviceId ? `Thiết bị ${deviceId}: ` : ''}
          Chưa hỗ trợ xuất dữ liệu giới hạn theo thiết bị hoặc khoảng thời gian.
          Để tránh xuất nhầm dữ liệu của các xe khác, hệ thống không tạo file
          toàn đội xe từ yêu cầu này.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
        <Button asChild>
          <Link href="/dashboard/exports" onClick={() => onOpenChange(false)}>
            Trang xuất toàn hệ thống
          </Link>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
