'use client';

import { useEffect, useState } from 'react';
import { Loader2, UploadCloud } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { firmwareServices } from '@/lib/api/firmware';
import { formatBytes } from './firmware-utils';

type FirmwareUploadDialogProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
};

export const FirmwareUploadDialog = ({ open, onOpenChange }: FirmwareUploadDialogProps) => {
  const queryClient = useQueryClient();
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) {
      setVersion('');
      setDescription('');
      setFile(null);
    }
  }, [open]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!version.trim() || !file) {
        throw new Error('Cần chọn file firmware và nhập phiên bản.');
      }

      const formData = new FormData();
      formData.append('version', version.trim());
      formData.append('description', description.trim());
      formData.append('file', file);

      return firmwareServices.upload(formData);
    },
    onSuccess: () => {
      toast.success('Tải firmware thành công');
      void queryClient.invalidateQueries({ queryKey: ['firmware'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Không thể tải firmware.');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Tải lên firmware</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firmware-version">Phiên bản phát hành</Label>
              <Input
                id="firmware-version"
                value={version}
                placeholder="Ví dụ: 1.4.2"
                onChange={(event) => setVersion(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="firmware-file">Tệp nhị phân</Label>
              <Input
                id="firmware-file"
                type="file"
                accept=".bin,.fw,.img,.hex,application/octet-stream"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            {file ? (
              <div className="space-y-1">
                <p className="font-medium text-foreground">{file.name}</p>
                <p>{formatBytes(file.size)}</p>
              </div>
            ) : (
              <p>Hỗ trợ `.bin`, `.fw`, `.img`, `.hex`. Chọn đúng file build OTA trước khi phát hành.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="firmware-description">Ghi chú phát hành</Label>
            <Textarea
              id="firmware-description"
              value={description}
              placeholder="Mô tả thay đổi chính hoặc lưu ý khi triển khai OTA."
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button disabled={uploadMutation.isPending} onClick={() => uploadMutation.mutate()}>
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải lên...
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Tải lên
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
