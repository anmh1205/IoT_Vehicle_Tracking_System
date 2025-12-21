'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatTimestamp } from '@/lib/utils/date/format';
import { DEVICE_ANIMATIONS, DEVICE_RADIUS } from '../device-design-constants';
import { Filter, AlertCircle, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Hash } from 'lucide-react';
import { StatCard } from '../StatCard';
import { EmptyState } from './EmptyState';

export function DeviceDetailErrorCodesTab({
  errorCodes,
  pagination,
  status,
  type,
  onPageChange,
  onStatusChange,
  onTypeChange
}: {
  errorCodes: any[];
  pagination?: { page: number; totalPages: number };
  status: string;
  type: string;
  onPageChange: (page: number) => void;
  onStatusChange: (status: string) => void;
  onTypeChange: (type: string) => void;
}) {
  const summary = {
    total: errorCodes.length,
    active: errorCodes.filter((i) => i.status === 'active').length,
    resolved: errorCodes.filter((i) => i.status === 'resolved').length,
    critical: errorCodes.filter((i) => i.error_type === 'critical').length,
    warning: errorCodes.filter((i) => i.error_type === 'warning').length
  };

  const typeBadgeClass = (t?: string | null) => {
    switch (t) {
      case 'critical':
        return 'border-destructive/30 bg-destructive/10 text-destructive';
      case 'warning':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400';
      default:
        return 'border-border bg-muted/40 text-foreground';
    }
  };

  const statusBadgeClass = (s?: string | null) => {
    switch (s) {
      case 'active':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
      case 'resolved':
        return 'border-muted-foreground/20 bg-muted/30 text-foreground';
      default:
        return 'border-border bg-muted/40 text-foreground';
    }
  };

  return (
    <div className='space-y-4'>
      {/* Filters */}
      <div className='flex flex-wrap items-center gap-2'>
        <div className='flex items-center gap-2 text-xs font-semibold text-foreground'>
          <Filter className='h-4 w-4' />
          Bộ lọc
        </div>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className='w-[170px]'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='h-4 w-4 text-foreground/70' />
              <SelectValue placeholder='Trạng thái' />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Tất cả</SelectItem>
            <SelectItem value='active'>Active</SelectItem>
            <SelectItem value='resolved'>Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger className='w-[190px]'>
            <div className='flex items-center gap-2'>
              <AlertTriangle className='h-4 w-4 text-foreground/70' />
              <SelectValue placeholder='Loại lỗi' />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Tất cả</SelectItem>
            <SelectItem value='critical'>Critical</SelectItem>
            <SelectItem value='warning'>Warning</SelectItem>
            <SelectItem value='connection'>Connection</SelectItem>
            <SelectItem value='battery'>Battery</SelectItem>
            <SelectItem value='vibration'>Vibration</SelectItem>
            <SelectItem value='firmware'>Firmware</SelectItem>
            <SelectItem value='sensor'>Sensor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
        <StatCard title='Tổng' value={summary.total} icon={<Hash className='h-5 w-5 text-primary' />} gradient='primary' />
        <StatCard
          title='Active'
          value={summary.active}
          icon={<AlertCircle className='h-5 w-5 text-amber-600' />}
          gradient='warning'
        />
        <StatCard
          title='Resolved'
          value={summary.resolved}
          icon={<CheckCircle2 className='h-5 w-5 text-emerald-600' />}
          gradient='success'
        />
        <StatCard
          title='Critical'
          value={summary.critical}
          icon={<AlertTriangle className='h-5 w-5 text-destructive' />}
          gradient='danger'
        />
        <StatCard
          title='Warning'
          value={summary.warning}
          icon={<AlertTriangle className='h-5 w-5 text-amber-600' />}
          gradient='warning'
        />
      </div>

      {/* Table / Empty */}
      {!errorCodes || errorCodes.length === 0 ? (
        <EmptyState message='Không có mã lỗi phù hợp bộ lọc' icon='inbox' />
      ) : (
        <div className={`${DEVICE_RADIUS.md} border border-border shadow-md overflow-hidden`}>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/50 hover:bg-muted/50'>
                <TableHead className='font-semibold'>Mã lỗi</TableHead>
                <TableHead className='font-semibold'>Loại</TableHead>
                <TableHead className='font-semibold'>Trạng thái</TableHead>
                <TableHead className='font-semibold'>Thời gian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errorCodes.map((i, idx) => (
                <TableRow
                  key={i.id}
                  className={`${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'} ${DEVICE_ANIMATIONS.transition.normal} hover:bg-primary/5`}
                >
                  <TableCell className='font-mono text-xs font-semibold text-foreground'>{i.error_code}</TableCell>
                  <TableCell>
                    <Badge variant='outline' className={`text-xs font-semibold ${typeBadgeClass(i.error_type)}`}>
                      {i.error_type ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant='outline' className={`text-xs font-semibold ${statusBadgeClass(i.status)}`}>
                      {i.status ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-foreground/80 font-medium'>
                    {i.created_at ? formatTimestamp(i.created_at) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination?.totalPages != null && pagination.totalPages > 1 && (
        <div className='flex items-center justify-between gap-2 border-t border-border pt-4 text-sm'>
          <span className='font-medium text-muted-foreground'>
            Trang {pagination.page} / {pagination.totalPages}
          </span>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className={DEVICE_ANIMATIONS.transition.normal}
            >
              <ChevronLeft className='mr-1 h-4 w-4' />
              Trước
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className={DEVICE_ANIMATIONS.transition.normal}
            >
              Sau
              <ChevronRight className='ml-1 h-4 w-4' />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

