import { useMutation, useQueryClient } from '@tanstack/react-query';
import { exportServices, type CreateExportInput, type ExportJob } from '@/lib/api/export';
import { notificationUtils } from '@/lib/notification';
import { queryInvalidation } from '@/lib/utils/query-invalidation';
import { getApiErrorMessage } from '@/lib/utils/api-error';

interface UseCreateExportOptions {
  onSuccess?: (data: ExportJob) => void;
  onError?: (error: unknown) => void;
}

export const useCreateExport = (options: UseCreateExportOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateExportInput) => exportServices.create(payload),
    onSuccess: (data) => {
      queryInvalidation.exports.all(queryClient);
      notificationUtils.success('Đã tạo yêu cầu xuất dữ liệu');
      options.onSuccess?.(data);
    },
    onError: (error) => {
      notificationUtils.error(
        'Tạo yêu cầu xuất thất bại',
        getApiErrorMessage(error, 'Không thể tạo yêu cầu xuất dữ liệu'),
      );
      options.onError?.(error);
    },
  });
};
