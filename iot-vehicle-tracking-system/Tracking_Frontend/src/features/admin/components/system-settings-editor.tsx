'use client';
import { DataTable } from '@/components/common/data-table';
export const SystemSettingsEditor = ({ rows }: { rows: any[] }) => {
  const columns = Object.keys(rows[0] ?? {}).map((key) => ({ accessorKey: key, header: key }));
  return <DataTable columns={columns as any} data={rows} pagination={false} />;
};
