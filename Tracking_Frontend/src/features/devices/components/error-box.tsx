import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
export const ErrorBox = ({
  title = 'Đã xảy ra lỗi',
  description = 'Không thể tải dữ liệu thiết bị.',
}: {
  title?: string;
  description?: string;
}) => {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
};
