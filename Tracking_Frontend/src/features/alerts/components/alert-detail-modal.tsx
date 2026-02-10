'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import dynamic from 'next/dynamic';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Nghiêm trọng',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
  acknowledged: 'Đã xác nhận',
  resolved: 'Đã giải quyết',
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  speeding: 'Vượt tốc độ',
  geofence: 'Ra/vào vùng giám sát',
  offline: 'Mất kết nối',
  maintenance: 'Bảo trì',
  other: 'Khác',
  harsh_braking: 'Phanh gấp',
  idle_too_long: 'Dừng quá lâu',
};

export function AlertDetailModal({ open, onOpenChange, alert }: { open: boolean; onOpenChange: (v: boolean) => void; alert: any | null }) {
  const lat = Number(alert?.latitude ?? 10.762622);
  const lon = Number(alert?.longitude ?? 106.660172);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle>{alert?.title ?? 'Chi tiết cảnh báo'}</DialogTitle></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Loại:</span> {ALERT_TYPE_LABELS[alert?.alertType] ?? alert?.alertType ?? '-'}</div>
            <div><span className="font-medium">Mức độ:</span> {SEVERITY_LABELS[alert?.severity] ?? alert?.severity ?? '-'}</div>
            <div><span className="font-medium">Trạng thái:</span> {STATUS_LABELS[alert?.status] ?? alert?.status ?? '-'}</div>
            <div><span className="font-medium">Nội dung:</span> {alert?.message ?? '-'}</div>
          </div>
          <div className="h-[220px] overflow-hidden rounded border">
            <MapContainer center={[lat, lon]} zoom={13} className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[lat, lon]} />
            </MapContainer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

