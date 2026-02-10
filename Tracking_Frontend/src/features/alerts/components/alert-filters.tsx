'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AlertFilters({ severity, status, onChange }: { severity?: string; status?: string; onChange: (next: { severity?: string; status?: string }) => void }) {
  return (
    <div className="flex gap-2">
      <Select value={severity ?? 'all'} onValueChange={(v) => onChange({ severity: v === 'all' ? undefined : v, status })}><SelectTrigger className="w-40"><SelectValue placeholder="Mức độ" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả mức độ</SelectItem><SelectItem value="critical">Nghiêm trọng</SelectItem><SelectItem value="high">Cao</SelectItem><SelectItem value="medium">Trung bình</SelectItem><SelectItem value="low">Thấp</SelectItem></SelectContent></Select>
      <Select value={status ?? 'all'} onValueChange={(v) => onChange({ severity, status: v === 'all' ? undefined : v })}><SelectTrigger className="w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả trạng thái</SelectItem><SelectItem value="active">Đang hoạt động</SelectItem><SelectItem value="acknowledged">Đã xác nhận</SelectItem><SelectItem value="resolved">Đã giải quyết</SelectItem></SelectContent></Select>
    </div>
  );
}

