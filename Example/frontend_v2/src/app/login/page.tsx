'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { notificationUtils } from '@/lib/notification';
import { useAuthStore } from '@/lib/store/authStore';
import { ASSETS } from '@/lib/constants/assets';
import { THEME } from '@/lib/constants/theme';
import Link from 'next/link';

interface LoginFormValues {
  username: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, token, hasHydrated } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    defaultValues: { username: '', password: '' }
  });

  useEffect(() => {
    if (hasHydrated && token) {
      router.replace('/dashboard');
    }
  }, [hasHydrated, token, router]);

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    const ok = await login(values.username, values.password);
    setIsSubmitting(false);
    if (ok) {
      notificationUtils.success('Đăng nhập thành công');
      router.replace('/dashboard');
    } else {
      notificationUtils.error('Đăng nhập thất bại', 'Vui lòng kiểm tra tài khoản/mật khẩu');
    }
  };

  return (
    <div
      className='relative flex min-h-screen w-full items-center justify-center px-4 py-8 md:px-8'
      style={{
        backgroundImage: `url(${ASSETS.BACKGROUNDS.LOGIN_BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 24px',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className='relative z-10 flex w-full max-w-5xl items-center justify-center'>
        <div className='flex w-full max-w-md flex-col mt-24 md:mt-50'>
          <Card
            className='w-full border-2 border-gray/80 bg-gray/97 backdrop-blur-xl dark:border-white/25 dark:bg-slate-900/97'
            style={{
              borderRadius: THEME.BORDER_RADIUS.XL
            }}
          >
            <CardHeader className='space-y-2 text-center'>
              <CardTitle className='text-xl font-semibold tracking-tight md:text-2xl'>
                Đăng nhập IVM26
              </CardTitle>
              <CardDescription className='text-xs md:text-sm'>
                Nhập thông tin tài khoản để truy cập bảng điều khiển giám sát.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className='space-y-4' onSubmit={handleSubmit(onSubmit)}>
                <div className='space-y-2'>
                  <Label htmlFor='username'>Tên đăng nhập</Label>
                  <Input
                    id='username'
                    autoComplete='username'
                    className='h-11'
                    {...register('username', { required: 'Bắt buộc' })}
                  />
                  {errors.username && (
                    <p className='text-xs text-destructive md:text-sm'>
                      {errors.username.message}
                    </p>
                  )}
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='password'>Mật khẩu</Label>
                  <Input
                    id='password'
                    type='password'
                    autoComplete='current-password'
                    className='h-11'
                    {...register('password', { required: 'Bắt buộc' })}
                  />
                  {errors.password && (
                    <p className='text-xs text-destructive md:text-sm'>
                      {errors.password.message}
                    </p>
                  )}
                </div>
                <Button type='submit' className='mt-2 w-full' disabled={isSubmitting}>
                  {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Button>
              </form>
              <div className='mt-4 text-center text-[11px] text-muted-foreground md:text-xs'>
                <Link href='/' className='underline underline-offset-4 hover:text-foreground'>
                  Quay lại trang chủ
                </Link>
              </div>
              <div className='mt-6 text-center text-[10px] text-slate-400 md:text-[11px]'>
                © 2026 CÔNG TY CỔ PHẦN GIẢI PHÁP CÔNG NGHỆ CAO ME • IVM26 Monitoring Dashboard
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

