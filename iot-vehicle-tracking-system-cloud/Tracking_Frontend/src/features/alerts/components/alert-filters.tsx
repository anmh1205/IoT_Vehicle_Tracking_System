'use client';

import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const AlertFilters = ({
  severity,
  status,
  source,
  onChange,
  onReset,
}: {
  severity?: string;
  status?: string;
  source?: 'all' | 'obd' | 'system';
  onChange: (next: { severity?: string; status?: string; source?: 'all' | 'obd' | 'system' }) => void;
  onReset?: () => void;
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={severity ?? 'all'}
        onValueChange={(value) =>
          onChange({
            severity: value === 'all' ? undefined : value,
            status,
            source,
          })
        }
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Mức độ" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả mức độ</SelectItem>
          <SelectItem value="critical">Nghiêm trọng</SelectItem>
          <SelectItem value="high">Cao</SelectItem>
          <SelectItem value="medium">Trung bình</SelectItem>
          <SelectItem value="low">Thấp</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={status ?? 'all'}
        onValueChange={(value) =>
          onChange({
            severity,
            status: value === 'all' ? undefined : value,
            source,
          })
        }
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          <SelectItem value="active">Đang hoạt động</SelectItem>
          <SelectItem value="acknowledged">Đã xác nhận</SelectItem>
          <SelectItem value="resolved">Đã giải quyết</SelectItem>
          <SelectItem value="dismissed">Đã bỏ qua</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={source ?? 'all'}
        onValueChange={(value) =>
          onChange({
            severity,
            status,
            source: value as 'all' | 'obd' | 'system',
          })
        }
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Nguồn cảnh báo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả nguồn</SelectItem>
          <SelectItem value="obd">Bảo trì OBD</SelectItem>
          <SelectItem value="system">Hệ thống / khác</SelectItem>
        </SelectContent>
      </Select>

      <Button type="button" variant="outline" onClick={() => onReset?.()}>
        <RotateCcw className="mr-2 h-4 w-4" />
        Đặt lại
      </Button>
    </div>
  );
};
