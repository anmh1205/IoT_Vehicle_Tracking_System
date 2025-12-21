'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelative } from '@/lib/utils/date/format';

interface FirmwareAssignmentsLogProps {
  assignments: any[];
  logs: any[];
  assignmentsLoading: boolean;
  logsLoading: boolean;
}

function LogSkeleton({ rows }: { rows: number }) {
  return (
    <div className='space-y-2'>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className='flex items-center gap-3 rounded border p-3'>
          <Skeleton className='h-4 w-28' />
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-4 w-20' />
          <Skeleton className='h-4 w-32' />
        </div>
      ))}
    </div>
  );
}

export function FirmwareAssignmentsLog({
  assignments,
  logs,
  assignmentsLoading,
  logsLoading
}: FirmwareAssignmentsLogProps) {
  return (
    <div className='mt-6 space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Danh sách lệnh cập nhật</CardTitle>
          <CardDescription>10 lệnh gần nhất</CardDescription>
        </CardHeader>
        <CardContent>
          {assignmentsLoading ? (
            <LogSkeleton rows={4} />
          ) : !assignments?.length ? (
            <div className='py-8 text-center text-sm text-muted-foreground'>Không có lệnh cập nhật.</div>
          ) : (
            <div className='rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thiết bị</TableHead>
                    <TableHead>Phiên bản</TableHead>
                    <TableHead>Chế độ</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Tiến độ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => {
                    const item = a as any;
                    const desiredVersion = item.new_version ?? item.firmware_version ?? '—';
                    const mode = item.firmware_mode ?? 'fixed';
                    const progress = item.progress ?? 0;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className='font-medium'>{a.device_id}</TableCell>
                        <TableCell>{desiredVersion}</TableCell>
                        <TableCell>
                          <Badge variant='outline'>{mode}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant='secondary'>{a.status ?? '—'}</Badge>
                        </TableCell>
                        <TableCell className='w-[200px]'>
                          <Progress value={progress} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nhật ký gán firmware</CardTitle>
          <CardDescription>10 log gần nhất</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <LogSkeleton rows={5} />
          ) : !logs?.length ? (
            <div className='py-8 text-center text-sm text-muted-foreground'>Không có log.</div>
          ) : (
            <div className='rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thiết bị</TableHead>
                    <TableHead>Phiên bản</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Thời gian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => {
                    const log = l as any;
                    const version = log.new_version ?? log.firmware_version ?? '—';
                    const time = log.started_at || log.completed_at || null;
                    return (
                      <TableRow key={l.id}>
                        <TableCell className='font-medium'>{l.device_id}</TableCell>
                        <TableCell>{version}</TableCell>
                        <TableCell>
                          <Badge variant='outline'>{l.status ?? '—'}</Badge>
                        </TableCell>
                        <TableCell className='text-muted-foreground'>{time ? formatRelative(time) : '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

