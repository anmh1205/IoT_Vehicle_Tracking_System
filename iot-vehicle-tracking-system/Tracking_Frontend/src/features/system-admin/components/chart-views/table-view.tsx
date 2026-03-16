'use client';

import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { MetricSeries } from '@/features/system-admin/types';

export const TableView = ({ series }: { series: MetricSeries[] }) => {
  const rows = series.flatMap((item) =>
    item.points.map((point) => ({
      name: item.name,
      timestamp: point.timestamp,
      value: point.value,
    })),
  );

  return (
    <Card>
      <CardContent className="max-h-[380px] overflow-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chuỗi</TableHead>
              <TableHead>Thời điểm</TableHead>
              <TableHead>Giá trị</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={`${row.name}-${row.timestamp}-${index}`}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{format(new Date(row.timestamp), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                <TableCell>{row.value}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-20 text-center text-sm text-muted-foreground">
                  Không có dòng dữ liệu chỉ số.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
