/**
 * Hook for polling export job status
 */
import { useQuery } from '@tanstack/react-query';
import { exportServices } from '@/lib/api/export';

export const useExportStatus = (jobId: string | null | undefined, enabled: boolean = true) => {
    return useQuery<Export.ExportJobStatus, Error>({
        queryKey: ['exportStatus', jobId],
        queryFn: () => {
            if (!jobId) throw new Error('Job ID is required');
            return exportServices.getExportStatus(jobId);
        },
        enabled: enabled && !!jobId,
        staleTime: 0,
    });
};
