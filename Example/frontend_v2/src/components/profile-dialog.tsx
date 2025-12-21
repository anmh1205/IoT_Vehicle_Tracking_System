'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { userServices } from '@/lib/api/users';
import { useAuthStore } from '@/lib/store/authStore';
import { notificationUtils } from '@/lib/notification';
import { http } from '@/lib/api/http';

// Helper function to hash password using SHA-256
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Profile form schema
const profileFormSchema = z
  .object({
    full_name: z.string().min(3, { message: 'Họ tên phải có ít nhất 3 ký tự' }),
    current_password: z.string().optional(),
    new_password: z.string().optional(),
    confirm_password: z.string().optional()
  })
  .refine(
    (data) => {
      // If any password field is filled, all password fields are required
      const hasAnyPassword = data.current_password || data.new_password || data.confirm_password;
      if (hasAnyPassword) {
        return (
          !!data.current_password &&
          !!data.new_password &&
          !!data.confirm_password
        );
      }
      return true;
    },
    {
      message: 'Vui lòng điền đầy đủ các trường mật khẩu nếu muốn đổi mật khẩu',
      path: ['current_password']
    }
  )
  .refine(
    (data) => {
      // If new_password is provided, it must be at least 6 characters
      if (data.new_password && data.new_password.length > 0) {
        return data.new_password.length >= 6;
      }
      return true;
    },
    {
      message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
      path: ['new_password']
    }
  )
  .refine(
    (data) => {
      // confirm_password must match new_password
      if (data.new_password && data.confirm_password) {
        return data.new_password === data.confirm_password;
      }
      return true;
    },
    {
      message: 'Mật khẩu xác nhận không khớp',
      path: ['confirm_password']
    }
  );

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: '',
      current_password: '',
      new_password: '',
      confirm_password: ''
    }
  });

  // Load user data when dialog opens
  useEffect(() => {
    if (open && user) {
      form.reset({
        full_name: user.fullName || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      // Reset password visibility states
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [open, user, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Update full name
      const updatePayload: User.UpdateUserRequest = {
        full_name: values.full_name
      };
      await userServices.update(user.id, updatePayload);

      // Change password if provided
      if (
        values.current_password &&
        values.new_password &&
        values.confirm_password
      ) {
        const currentPasswordHash = await hashPassword(values.current_password);
        const newPasswordHash = await hashPassword(values.new_password);

        await http.post('/auth/change-password', {
          currentPassword: currentPasswordHash,
          newPassword: newPasswordHash
        });
      }

      // Update auth store with new fullName
      useAuthStore.setState((state) => ({
        ...state,
        user: state.user
          ? {
              ...state.user,
              fullName: values.full_name
            }
          : null
      }));

      const message =
        values.current_password && values.new_password
          ? 'Thông tin tài khoản và mật khẩu đã được cập nhật'
          : 'Thông tin tài khoản đã được cập nhật';

      notificationUtils.success('Cập nhật thành công', message);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      notificationUtils.error(
        'Cập nhật thất bại',
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi cập nhật thông tin'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing dialog
      form.reset({
        full_name: user?.fullName || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      // Reset password visibility states
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Thông tin tài khoản</DialogTitle>
          <DialogDescription>
            Xem và cập nhật thông tin tài khoản của bạn. Để trống các trường mật khẩu nếu không muốn thay đổi.
          </DialogDescription>
        </DialogHeader>
        <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
          <div className='space-y-4 py-4'>
            <FormField
              control={form.control}
              name='full_name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Họ tên</FormLabel>
                  <FormControl>
                    <Input placeholder='Nhập họ tên' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='space-y-2'>
              <FormLabel>Tên đăng nhập</FormLabel>
              <Input value={user.username} disabled className='bg-muted' />
              <p className='text-xs text-muted-foreground'>
                Tên đăng nhập không thể thay đổi
              </p>
            </div>
            <div className='space-y-2'>
              <FormLabel>Vai trò</FormLabel>
              <Input
                value={user.role === 'root' ? 'Root' : user.role === 'admin' ? 'Admin' : 'User'}
                disabled
                className='bg-muted'
              />
              <p className='text-xs text-muted-foreground'>
                Vai trò không thể thay đổi
              </p>
            </div>
            <div className='space-y-4 border-t pt-4'>
              <p className='text-sm font-medium'>Đổi mật khẩu</p>
              <p className='text-xs text-muted-foreground'>
                Để trống tất cả các trường mật khẩu nếu không muốn thay đổi
              </p>

              <FormField
                control={form.control}
                name='current_password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mật khẩu hiện tại</FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Input
                          type={showCurrentPassword ? 'text' : 'password'}
                          placeholder='Nhập mật khẩu hiện tại'
                          {...field}
                          className='pr-10'
                        />
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className='h-4 w-4 text-muted-foreground' />
                          ) : (
                            <Eye className='h-4 w-4 text-muted-foreground' />
                          )}
                          <span className='sr-only'>
                            {showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          </span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='new_password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mật khẩu mới</FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder='Nhập mật khẩu mới (tối thiểu 6 ký tự)'
                          {...field}
                          className='pr-10'
                        />
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className='h-4 w-4 text-muted-foreground' />
                          ) : (
                            <Eye className='h-4 w-4 text-muted-foreground' />
                          )}
                          <span className='sr-only'>
                            {showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          </span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='confirm_password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Xác nhận mật khẩu mới</FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder='Nhập lại mật khẩu mới'
                          {...field}
                          className='pr-10'
                        />
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className='h-4 w-4 text-muted-foreground' />
                          ) : (
                            <Eye className='h-4 w-4 text-muted-foreground' />
                          )}
                          <span className='sr-only'>
                            {showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          </span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

