'use client';

import { useEffect, useState } from 'react';
import { ArrowDownToLine } from 'lucide-react';
import { useCreateExport } from '@/hooks/mutations/useCreateExport';
import { useExportStatus } from '@/hooks/queries/useExportStatus';
import { exportServices } from '@/lib/api/export';
import { Button } from '@/components/ui/button';

interface ITabExportButtonProps {
  page: string;
  tab?: string;
  deviceId?: string;
  filters?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  fileName?: string;
  className?: string;
}

export function TabExportButton(props: ITabExportButtonProps) {
  const { page, tab, deviceId, filters, sortBy, sortOrder, fileName, className } = props;
  const createExport = useCreateExport();
  const [jobId, setJobId] = useState<string | null>(null);
  const { data: jobStatus } = useExportStatus(jobId, !!jobId);

  useEffect(() => {
    if (jobStatus?.status === 'completed' && jobStatus.downloadToken) {
      exportServices
        .downloadExport(jobStatus.downloadToken)
        .then(() => setJobId(null))
        .catch(() => {
          // handled in api client
        });
    }
  }, [jobStatus?.status, jobStatus?.downloadToken]);

  const handleExport = async () => {
    try {
      const config: Export.ExportConfigInput = {
        page,
        tab,
        deviceId,
        filters,
        sortBy,
        sortOrder,
        fileName,
        asyncPreferred: false
      };
      const result = await createExport.mutateAsync(config);
      if (result.kind === 'job' && result.jobId) {
        setJobId(result.jobId);
      }
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  return (
    <Button
      size='sm'
      variant='outline'
      className={className}
      onClick={handleExport}
      disabled={createExport.isPending}
    >
      <ArrowDownToLine className='w-4 h-4 mr-1' />
      {createExport.isPending ? 'Đang xuất...' : 'Xuất Excel'}
    </Button>
  );
}


