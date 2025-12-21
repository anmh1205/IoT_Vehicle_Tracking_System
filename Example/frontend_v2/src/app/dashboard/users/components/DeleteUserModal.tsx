'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteUserModalProps {
  open: boolean;
  user: User.UserDto | null;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}

export function DeleteUserModal({ open, user, onConfirm, onCancel, submitting }: DeleteUserModalProps) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa người dùng</DialogTitle>
          <DialogDescription>
            Bạn có chắc muốn xóa tài khoản {user.username}? Hành động này không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className='pt-4'>
          <Button variant='outline' onClick={onCancel}>
            Hủy
          </Button>
          <Button variant='destructive' onClick={onConfirm} disabled={submitting}>
            Xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

