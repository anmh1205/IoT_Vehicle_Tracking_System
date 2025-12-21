'use client';

import { useMemo } from 'react';
import { StatCard } from '@/app/dashboard/device/components/StatCard';
import { HardDrive, ShieldCheck, Sparkles, Database } from 'lucide-react';

interface FirmwareStatsProps {
  firmwareList: Firmware.FirmwareDto[];
}

export function FirmwareStats({ firmwareList }: FirmwareStatsProps) {
  const stableCount = useMemo(
    () => firmwareList.filter((fw) => (fw as any).is_active || (fw as any).is_stable).length,
    [firmwareList]
  );

  const stableVersion = useMemo(
    () => firmwareList.find((fw) => (fw as any).is_active || (fw as any).is_stable)?.version ?? '—',
    [firmwareList]
  );

  const totalSize = useMemo(
    () => firmwareList.reduce((sum, fw) => sum + ((fw as any).size || 0), 0),
    [firmwareList]
  );

  return (
    <div className='mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
      <StatCard
        title='Tổng firmware'
        value={firmwareList.length}
        icon={<HardDrive className='h-4 w-4 text-primary' />}
        gradient='primary'
      />
      <StatCard
        title='Stable'
        value={stableCount}
        icon={<ShieldCheck className='h-4 w-4 text-emerald-600 dark:text-emerald-400' />}
        gradient='success'
      />
      <StatCard
        title='Phiên bản stable'
        value={stableVersion}
        icon={<Sparkles className='h-4 w-4 text-amber-600 dark:text-amber-400' />}
        gradient='warning'
      />
      <StatCard
        title='Dung lượng'
        value={`${(totalSize / 1024 / 1024).toFixed(2)} MB`}
        icon={<Database className='h-4 w-4 text-blue-600 dark:text-blue-400' />}
        gradient='secondary'
      />
    </div>
  );
}

