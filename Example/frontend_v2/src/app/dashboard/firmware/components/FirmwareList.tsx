'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { firmwareServices } from '@/lib/api/firmware';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, FileUp, X, Trash2 } from 'lucide-react';

interface FirmwareListProps {
  firmwareList: Firmware.FirmwareDto[];
  loading: boolean;
  error: Error | null;
  search: string;
  onSearch: (value: string) => void;
  onUpload: (file: File, firmwareName?: string, version?: string) => Promise<void>;
  onActivate?: (version: string) => void;
  onDelete?: (version: string) => Promise<void>;
}

function FirmwareSkeleton() {
  return (
    <div className='space-y-2'>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className='flex items-center gap-3 rounded border p-3'>
          <Skeleton className='h-4 w-40' />
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-8 w-20 ml-auto' />
        </div>
      ))}
    </div>
  );
}

export function FirmwareList({
  firmwareList,
  loading,
  error,
  search,
  onSearch,
  onUpload,
  onActivate,
  onDelete
}: FirmwareListProps) {
  const queryClient = useQueryClient();
  const [uploadDialog, setUploadDialog] = useState<{
    open: boolean;
    file: File | null;
    firmwareName: string;
    version: string;
  }>({
    open: false,
    file: null,
    firmwareName: '',
    version: ''
  });
  const [uploading, setUploading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    firmware: Firmware.FirmwareDto | null;
  }>({
    open: false,
    firmware: null
  });
  const [deleting, setDeleting] = useState(false);

  const filteredFirmware = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return firmwareList.filter(
      (fw) =>
        !keyword ||
        fw.filename?.toLowerCase().includes(keyword) ||
        fw.version?.toLowerCase().includes(keyword)
    );
  }, [firmwareList, search]);

  const onDrop = async (files: File[]) => {
    if (!files.length) return;
    const file = files[0];
    
    // Extract version from filename if possible (e.g., firmware_v1.0.0.bin -> 1.0.0)
    const versionMatch = file.name.match(/v?(\d+\.\d+\.\d+)/i);
    const defaultVersion = versionMatch ? versionMatch[1] : '';
    
    setUploadDialog({
      open: true,
      file,
      firmwareName: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      version: defaultVersion
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/octet-stream': ['.bin', '.hex'],
      'application/x-binary': ['.bin', '.hex']
    },
    multiple: false
  });

  const handleConfirmUpload = async () => {
    if (!uploadDialog.file) return;
    
    if (!uploadDialog.version.trim()) {
      // Show error - version is required
      return;
    }

    setUploading(true);
    try {
      await onUpload(
        uploadDialog.file,
        uploadDialog.firmwareName.trim() || uploadDialog.file.name,
        uploadDialog.version.trim()
      );
      setUploadDialog({ open: false, file: null, firmwareName: '', version: '' });
      queryClient.invalidateQueries({ queryKey: ['firmware', 'list'] });
    } catch (error) {
      // Error handling is done in onUpload function
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleCancelUpload = () => {
    setUploadDialog({ open: false, file: null, firmwareName: '', version: '' });
  };

  const handleDeleteClick = (firmware: Firmware.FirmwareDto) => {
    setDeleteDialog({ open: true, firmware });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.firmware || !onDelete) return;

    setDeleting(true);
    try {
      await onDelete(deleteDialog.firmware.version || '');
      setDeleteDialog({ open: false, firmware: null });
      queryClient.invalidateQueries({ queryKey: ['firmware', 'list'] });
    } catch (error) {
      // Error handling is done in onDelete function
      console.error('Delete failed:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialog({ open: false, firmware: null });
  };

  return (
    <Card className='mb-4'>
      <CardHeader>
        <CardTitle>Danh sách firmware</CardTitle>
        <CardDescription>Tải lên và quản lý các phiên bản</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <Input
            placeholder='Tìm theo tên/phiên bản...'
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className='w-full sm:w-[260px] sm:flex-shrink-0'
          />
          <div
            {...getRootProps()}
            className={cn(
              'group relative flex items-center gap-2 rounded-lg border-2 border-dashed p-3 text-sm transition-all cursor-pointer',
              'hover:border-primary hover:bg-primary/5',
              isDragActive && 'border-primary bg-primary/10 text-primary border-solid',
              !isDragActive && 'border-muted-foreground/25 text-muted-foreground',
              'flex-1 sm:flex-initial sm:min-w-[280px]'
            )}
          >
            <input {...getInputProps()} />
            <div className='flex items-center gap-2 flex-1 min-w-0'>
              {isDragActive ? (
                <>
                  <FileUp className='h-4 w-4 text-primary shrink-0' />
                  <span className='font-medium text-primary text-xs sm:text-sm truncate'>Thả file để tải lên</span>
                </>
              ) : (
                <>
                  <Upload className='h-4 w-4 group-hover:text-primary transition-colors shrink-0' />
                  <div className='flex-1 min-w-0'>
                    <div className='text-xs sm:text-sm'>
                      <span className='font-medium'>Kéo/thả hoặc bấm để chọn file</span>
                    </div>
                    <div className='text-xs text-muted-foreground truncate'>.bin, .hex</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {error ? (
          <div className='rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive'>
            Không thể tải danh sách firmware: {error.message}
          </div>
        ) : loading ? (
          <FirmwareSkeleton />
        ) : filteredFirmware.length === 0 ? (
          <div className='py-10 text-center text-sm text-muted-foreground'>Chưa có firmware.</div>
        ) : (
          <div className='rounded-lg border overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên file</TableHead>
                  <TableHead>Phiên bản</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Kích thước</TableHead>
                  <TableHead>Tạo lúc</TableHead>
                  <TableHead>SHA256</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead className='text-right'>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFirmware.map((fw) => {
                  const stable = (fw as any).is_active || (fw as any).is_stable;
                  const hash = (fw as any).sha256 as string | undefined;
                  const hashShort = hash ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : '—';
                  const desc = (fw as any).description || '—';
                  const createdExact = fw.created_at
                    ? new Date(fw.created_at).toLocaleString('vi-VN', {
                        hour12: false
                      })
                    : null;
                  return (
                    <TableRow key={fw.id} className='cursor-pointer hover:bg-muted/50'>
                      <TableCell className='font-medium'>{fw.filename || '—'}</TableCell>
                      <TableCell>{fw.version || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={stable ? 'default' : 'outline'}>{stable ? 'Stable' : 'Fixed'}</Badge>
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {fw.size ? `${(fw.size / 1024).toFixed(1)} KB` : '—'}
                      </TableCell>
                      <TableCell className='text-muted-foreground' title={createdExact ?? undefined}>
                        {createdExact ?? '—'}
                      </TableCell>
                      <TableCell className='text-muted-foreground font-mono text-xs'>{hashShort}</TableCell>
                      <TableCell className='text-muted-foreground text-sm max-w-[200px] truncate'>{desc}</TableCell>
                      <TableCell className='text-right'>
                        <div className='flex justify-end gap-2'>
                          {!stable && onActivate && (
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={async () => {
                                await onActivate(fw.version || '');
                                queryClient.invalidateQueries({ queryKey: ['firmware', 'list'] });
                              }}
                            >
                              Đặt stable
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleDeleteClick(fw)}
                              className='text-destructive hover:text-destructive hover:bg-destructive/10'
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog.open} onOpenChange={(open) => {
        if (!open) {
          handleCancelUpload();
        }
      }}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>Tải lên firmware</DialogTitle>
            <DialogDescription>
              Vui lòng nhập thông tin firmware trước khi tải lên
            </DialogDescription>
          </DialogHeader>
          
          {uploadDialog.file && (
            <div className='space-y-4 py-4'>
              <div className='rounded-lg border p-4 bg-muted/50'>
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium truncate'>{uploadDialog.file.name}</p>
                    <p className='text-xs text-muted-foreground mt-1'>
                      {(uploadDialog.file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-6 w-6 shrink-0'
                    onClick={handleCancelUpload}
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='firmware-name'>
                  Tên firmware <span className='text-muted-foreground'>(tùy chọn)</span>
                </Label>
                <Input
                  id='firmware-name'
                  placeholder='Nhập tên firmware'
                  value={uploadDialog.firmwareName}
                  onChange={(e) =>
                    setUploadDialog((prev) => ({ ...prev, firmwareName: e.target.value }))
                  }
                  disabled={uploading}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='firmware-version'>
                  Phiên bản <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='firmware-version'
                  placeholder='Ví dụ: 1.0.0'
                  value={uploadDialog.version}
                  onChange={(e) =>
                    setUploadDialog((prev) => ({ ...prev, version: e.target.value }))
                  }
                  disabled={uploading}
                  className={!uploadDialog.version.trim() ? 'border-destructive' : ''}
                />
                <p className='text-xs text-muted-foreground'>
                  Phiên bản phải đúng và duy nhất (ví dụ: 1.0.0, 1.0.1)
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant='outline' onClick={handleCancelUpload} disabled={uploading}>
              Hủy
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={uploading || !uploadDialog.version.trim() || !uploadDialog.file}
            >
              {uploading ? 'Đang tải lên...' : 'Tải lên'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => {
        if (!open) {
          handleCancelDelete();
        }
      }}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa firmware</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa firmware này không? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          
          {deleteDialog.firmware && (
            <div className='py-4 space-y-2'>
              <div className='rounded-lg border p-4 bg-muted/50'>
                <div className='space-y-1'>
                  <div className='flex justify-between'>
                    <span className='text-sm text-muted-foreground'>Tên file:</span>
                    <span className='text-sm font-medium'>{deleteDialog.firmware.filename || '—'}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-sm text-muted-foreground'>Phiên bản:</span>
                    <span className='text-sm font-medium'>{deleteDialog.firmware.version || '—'}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-sm text-muted-foreground'>Kích thước:</span>
                    <span className='text-sm font-medium'>
                      {deleteDialog.firmware.size ? `${(deleteDialog.firmware.size / 1024).toFixed(2)} KB` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant='outline' onClick={handleCancelDelete} disabled={deleting}>
              Hủy
            </Button>
            <Button
              variant='destructive'
              onClick={handleConfirmDelete}
              disabled={deleting || !deleteDialog.firmware}
            >
              {deleting ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

