/**
 * Hook for creating exports
 */
import { useMutation } from '@tanstack/react-query';
import { exportServices } from '@/lib/api/export';

export const useCreateExport = () => {
    return useMutation<Export.ExportResponse, Error, Export.ExportConfigInput>({
        mutationFn: (context: Export.ExportConfigInput) => exportServices.createExport(context),
        onError: (error) => {
            console.error('Export creation failed:', error);
        }
    });
};
