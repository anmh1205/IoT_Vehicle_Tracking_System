import { Badge } from '@/components/ui/badge';
import { InfiniteScrollTrigger } from '@/components/common/infinite-scroll-trigger';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/utils/date/format';
import { DeviceDetailEmptyState } from './empty-state';
import { useDeviceDetailModal } from './modal-context';

const getType = (
  errorCode: number,
  errorName: string,
  severity?: string,
): 'critical' | 'warning' | 'info' => {
  const normalizedSeverity = String(severity ?? '').toLowerCase();
  if (normalizedSeverity === 'critical' || normalizedSeverity === 'high') return 'critical';
  if (normalizedSeverity === 'medium' || normalizedSeverity === 'low') return 'warning';
  if (/^[PCBU][0-9A-F]{4}$/i.test(errorName)) return 'warning';
  if (errorCode >= 500) return 'critical';
  if (errorCode >= 200) return 'warning';
  return 'info';
};

const formatErrorCodeLabel = (errorCode: number, errorName: string): string =>
  /^[PCBU][0-9A-F]{4}$/i.test(errorName) ? errorName : String(errorCode);

export const ErrorCodesTab = () => {
  const {
    errorCodes,
    errorCodesTotal,
    errorCodesLoadedCount,
    errorCodesHasMore,
    errorCodesStatus,
    errorCodesType,
    onErrorCodesLoadMore,
    onErrorCodesStatusChange,
    onErrorCodesTypeChange,
  } = useDeviceDetailModal();

  const hasActiveFilter = errorCodesStatus !== 'all' || errorCodesType !== 'all';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select value={errorCodesStatus} onValueChange={(value) => onErrorCodesStatusChange(value as any)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Trạng thái lỗi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="resolved">Đã xử lý</SelectItem>
          </SelectContent>
        </Select>

        <Select value={errorCodesType} onValueChange={(value) => onErrorCodesTypeChange(value as any)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Mức độ lỗi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả mức độ</SelectItem>
            <SelectItem value="critical">Nghiêm trọng</SelectItem>
            <SelectItem value="warning">Cảnh báo</SelectItem>
            <SelectItem value="info">Thông tin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {errorCodes.length === 0 ? (
        <DeviceDetailEmptyState
          title={hasActiveFilter ? 'Không có mã lỗi phù hợp' : 'Không có mã lỗi'}
          description={
            hasActiveFilter
              ? 'Không có bản ghi nào khớp bộ lọc đang chọn. Bộ lọc vẫn được giữ để bạn đổi lại.'
              : 'Thiết bị chưa ghi nhận mã lỗi ECU trong giai đoạn đang xem.'
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Tên lỗi</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Mức độ</TableHead>
                <TableHead>Phát sinh</TableHead>
                <TableHead>Đã xử lý</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errorCodes.map((item) => {
                const type = getType(item.errorCode, item.errorName, item.severity);
                return (
                  <TableRow key={item.id}>
                    <TableCell>{formatErrorCodeLabel(item.errorCode, item.errorName)}</TableCell>
                    <TableCell>{item.errorName}</TableCell>
                    <TableCell className="max-w-[260px] truncate">{item.description || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          type === 'critical'
                            ? 'destructive'
                            : type === 'warning'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {type === 'critical' ? 'Nghiêm trọng' : type === 'warning' ? 'Cảnh báo' : 'Thông tin'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(item.occurredAt)}</TableCell>
                    <TableCell>{item.resolvedAt ? formatDateTime(item.resolvedAt) : '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Hiển thị {errorCodes.length} lỗi từ {errorCodesLoadedCount} mục đã tải.
        </p>
        <InfiniteScrollTrigger
          hasMore={errorCodesHasMore}
          onLoadMore={onErrorCodesLoadMore}
          loadedCount={errorCodesLoadedCount}
          totalCount={errorCodesTotal}
          itemLabel="mã lỗi"
        />
      </div>
    </div>
  );
};
